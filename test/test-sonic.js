const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Create a socket.io client
const socket = io('http://localhost:3333');

// Event handlers
socket.on('connect', () => {
    console.log('Connected to server');

    // Initialize the session
    socket.emit('promptStart');

    // Set up system prompt
    const systemPrompt = "You are a helpful, friendly AI assistant. Keep your answers concise.";
    socket.emit('systemPrompt', systemPrompt);

    // Start audio streaming
    socket.emit('audioStart');

    // Send a test audio file
    const testAudioPath = path.join(__dirname, 'speech_test.wav');
    if (fs.existsSync(testAudioPath)) {
        console.log('Sending test audio file:', testAudioPath);
        const audioData = fs.readFileSync(testAudioPath);
        const audioBase64 = audioData.toString('base64');
        socket.emit('audioInput', audioBase64);
    } else {
        console.log('No test audio file found at', testAudioPath);
    }
});

// Listen for textOutput events
socket.on('textOutput', (data) => {
    console.log('Text Output:', data);
});

// Listen for audioOutput events
socket.on('audioOutput', (data) => {
    console.log('Audio Output received, length:', data.content.length);
});

// Listen for errors
socket.on('error', (data) => {
    console.error('Error:', data);
});

// Listen for disconnection
socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Close the socket after a certain time for testing
setTimeout(() => {
    console.log('Stopping audio and closing connection...');
    socket.emit('stopAudio');
    setTimeout(() => {
        socket.close();
        process.exit(0);
    }, 2000);
}, 10000);