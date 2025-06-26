import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { NovaSonicBidirectionalStreamClient } from './client';
import { Buffer } from 'node:buffer';

// Configure AWS credentials
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Ensure required environment variables are set
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error('Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set');
    process.exit(1);
}

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Add middleware to parse JSON requests
app.use(express.json());

// Store all active Bedrock clients
const bedrockClients = new Map();

// Periodically check for and close inactive sessions (every minute)
// Sessions with no activity for over 5 minutes will be force closed
setInterval(() => {
    console.log("Session cleanup check");
    const now = Date.now();

    // Check all active clients and their sessions
    bedrockClients.forEach((client, clientId) => {
        // Check all active sessions for this client
        client.getActiveSessions().forEach((sessionId: string) => {
            const lastActivity = client.getLastActivityTime(sessionId);

            // If no activity for 5 minutes, force close
            if (now - lastActivity > 5 * 60 * 1000) {
                console.log(`Closing inactive session ${sessionId} after 5 minutes of inactivity`);
                try {
                    client.forceCloseSession(sessionId);
                } catch (error) {
                    console.error(`Error force closing inactive session ${sessionId}:`, error);
                }
            }
        });
    });
}, 60000);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Create a unique session ID for this client
    const sessionId = socket.id;

    // Create a new Bedrock client for this connection
    const bedrockClient = new NovaSonicBidirectionalStreamClient({
        requestHandlerConfig: {
            maxConcurrentStreams: 10,
        },
        clientConfig: {
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY
            }
        }
    });

    // Store the client
    bedrockClients.set(sessionId, bedrockClient);

    try {
        // Create session with the new API
        const session = bedrockClient.createStreamSession(sessionId);
        bedrockClient.initiateSession(sessionId)

        setInterval(() => {
            const connectionCount = Object.keys(io.sockets.sockets).length;
            console.log(`Active socket connections: ${connectionCount}`);
        }, 60000);

        // Set up event handlers
        session.onEvent('contentStart', (data) => {
            console.log('contentStart:', data);
            socket.emit('contentStart', data);
        });

        session.onEvent('textOutput', (data) => {
            console.log('Text output:', data);
            socket.emit('textOutput', data);
        });

        session.onEvent('audioOutput', (data) => {
            console.log('Audio output received, sending to client');
            socket.emit('audioOutput', data);
        });

        session.onEvent('error', (data) => {
            console.error('Error in session:', data);
            socket.emit('error', data);
        });

        session.onEvent('toolUse', (data) => {
            console.log('Tool use detected:', data.toolName);
            socket.emit('toolUse', data);
        });

        session.onEvent('toolResult', (data) => {
            console.log('Tool result received');
            socket.emit('toolResult', data);
        });

        session.onEvent('contentEnd', (data) => {
            console.log('Content end received: ', data);
            socket.emit('contentEnd', data);
        });

        session.onEvent('streamComplete', () => {
            console.log('Stream completed for client:', socket.id);
            socket.emit('streamComplete');
        });

        // Simplified audioInput handler without rate limiting
        socket.on('audioInput', async (audioData) => {
            try {
                // Convert base64 string to Buffer
                const audioBuffer = typeof audioData === 'string'
                    ? Buffer.from(audioData, 'base64')
                    : Buffer.from(audioData);

                // Stream the audio
                await session.streamAudio(audioBuffer);

            } catch (error) {
                console.error('Error processing audio:', error);
                socket.emit('error', {
                    message: 'Error processing audio',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        socket.on('promptStart', async (data) => {
            try {
                console.log('Prompt start received');
                await session.setupPromptStart(data.voiceId);
            } catch (error) {
                console.error('Error processing prompt start:', error);
                socket.emit('error', {
                    message: 'Error processing prompt start',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        socket.on('systemPrompt', async (data) => {
            try {
                console.log('System prompt received', data);
                await session.setupSystemPrompt(undefined, data);
            } catch (error) {
                console.error('Error processing system prompt:', error);
                socket.emit('error', {
                    message: 'Error processing system prompt',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        socket.on('audioStart', async (data) => {
            try {
                console.log('Audio start received', data);
                await session.setupStartAudio();
            } catch (error) {
                console.error('Error processing audio start:', error);
                socket.emit('error', {
                    message: 'Error processing audio start',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        socket.on('stopAudio', async () => {
            try {
                console.log('Stop audio requested, beginning proper shutdown sequence');

                // Chain the closing sequence
                await Promise.all([
                    session.endAudioContent()
                        .then(() => session.endPrompt())
                        .then(() => session.close())
                        .then(() => console.log('Session cleanup complete'))
                ]);
            } catch (error) {
                console.error('Error processing streaming end events:', error);
                socket.emit('error', {
                    message: 'Error processing streaming end events',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log('Client disconnected abruptly:', socket.id);

            if (bedrockClient.isSessionActive(sessionId)) {
                try {
                    console.log(`Beginning cleanup for abruptly disconnected session: ${socket.id}`);

                    // Add explicit timeouts to avoid hanging promises
                    const cleanupPromise = Promise.race([
                        (async () => {
                            await session.endAudioContent();
                            await session.endPrompt();
                            await session.close();
                        })(),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Session cleanup timeout')), 3000)
                        )
                    ]);

                    await cleanupPromise;
                    console.log(`Successfully cleaned up session after abrupt disconnect: ${socket.id}`);
                } catch (error) {
                    console.error(`Error cleaning up session after disconnect: ${socket.id}`, error);
                    try {
                        bedrockClient.forceCloseSession(sessionId);
                        console.log(`Force closed session: ${sessionId}`);
                    } catch (e) {
                        console.error(`Failed even force close for session: ${sessionId}`, e);
                    }
                } finally {
                    // Remove the client from the map
                    bedrockClients.delete(sessionId);

                    // Make sure socket is fully closed in all cases
                    if (socket.connected) {
                        socket.disconnect(true);
                    }
                }
            } else {
                // Remove the client from the map even if no active session
                bedrockClients.delete(sessionId);
            }
        });

    } catch (error) {
        console.error('Error creating session:', error);
        socket.emit('error', {
            message: 'Failed to initialize session',
            details: error instanceof Error ? error.message : String(error)
        });
        socket.disconnect();
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Use ws://${HOST}:${PORT} as your Astra Nova Sonic server`);
});

process.on('SIGINT', async () => {
    console.log('Shutting down server...');

    const forceExitTimer = setTimeout(() => {
        console.error('Forcing server shutdown after timeout');
        process.exit(1);
    }, 5000);

    try {
        // First close Socket.IO server which manages WebSocket connections
        await new Promise(resolve => io.close(resolve));
        console.log('Socket.IO server closed');

        // Then close all active sessions for all clients
        let totalSessions = 0;
        const closePromises: Promise<void>[] = [];

        bedrockClients.forEach((client, clientId) => {
            const activeSessions = client.getActiveSessions();
            totalSessions += activeSessions.length;

            activeSessions.forEach((sessionId: string) => {
                closePromises.push(
                    (async () => {
                        try {
                            await client.closeSession(sessionId);
                            console.log(`Closed session ${sessionId} during shutdown`);
                        } catch (error) {
                            console.error(`Error closing session ${sessionId} during shutdown:`, error);
                            client.forceCloseSession(sessionId);
                        }
                    })()
                );
            });
        });

        console.log(`Closing ${totalSessions} active sessions across all clients...`);
        await Promise.all(closePromises);

        // Now close the HTTP server with a promise
        await new Promise(resolve => server.close(resolve));
        clearTimeout(forceExitTimer);
        console.log('Server shut down');
        process.exit(0);
    } catch (error) {
        console.error('Error during server shutdown:', error);
        process.exit(1);
    }
});
