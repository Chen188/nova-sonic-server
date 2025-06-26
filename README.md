# Nova Sonic Server

This server provides a WebSocket interface for the Nova Sonic bidirectional streaming client, allowing audio streaming and text generation.

## Features

- WebSocket-based bidirectional streaming
- Audio input/output streaming
- Text generation with Nova Sonic model
- Tool use capabilities
- Credential management API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-access-key>
export AWS_REGION=<your-aws-region>

npm run start
```

## WebSocket API

The server exposes the following WebSocket events:

### Client to Server

- `promptStart`: Start a new prompt session
- `systemPrompt`: Set the system prompt
- `audioStart`: Start audio streaming
- `audioInput`: Send audio data (base64 encoded)
- `stopAudio`: Stop audio streaming
- `updateCredentials`: Update the credentials

### Server to Client

- `contentStart`: Indicates the start of content generation
- `textOutput`: Text output from the model
- `audioOutput`: Audio output from the model
- `contentEnd`: Indicates the end of content generation
- `error`: Error messages
- `streamComplete`: Indicates the completion of the stream
- `credentialsUpdateResult`: credentials update result