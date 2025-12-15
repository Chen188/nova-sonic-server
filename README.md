# Nova Sonic Server

This server provides a WebSocket interface for the Nova Sonic bidirectional streaming client, allowing audio streaming and text generation.

## Features

- WebSocket-based bidirectional streaming
- Audio input/output streaming
- Text generation with Nova Sonic model
- Tool use capabilities (date/time, weather)
- Credential management API
- TEN-Agent compatible (nova_sonic_python extension)
- Multi-language and multi-voice support
- Real-time audio processing with configurable sample rates

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
export AWS_BEDROCK_NOVA_SONIC_MODEL_ID=amazon.nova-2-sonic-v1:0  # Optional, defaults to amazon.nova-2-sonic-v1:0

npm run start
```

## Environment Variables

- `AWS_ACCESS_KEY_ID` (required): AWS access key ID
- `AWS_SECRET_ACCESS_KEY` (required): AWS secret access key
- `AWS_REGION` (optional): AWS region, defaults to `us-east-1`
- `AWS_BEDROCK_NOVA_SONIC_MODEL_ID` (optional): Nova Sonic model ID, defaults to `amazon.nova-2-sonic-v1:0`
- `PORT` (optional): Server port, defaults to `3333`
- `HOST` (optional): Server host, defaults to `0.0.0.0`

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

## TEN-Agent Integration

This server is fully compatible with the TEN-Agent framework's `nova_sonic_python` extension. To use with TEN-Agent:

1. Start the Nova Sonic server:
```bash
npm run start
```

2. Configure TEN-Agent to use this server by setting the WebSocket URL in your TEN-Agent configuration:
```python
websocket_url = "ws://localhost:3333"  # or your server's address
```

### Supported Audio Formats
- **Input**: 16kHz, 16-bit PCM, mono (LPCM)
- **Output**: 24kHz, 16-bit PCM, mono (LPCM)

### Supported Voices
- **English (US)**: tiffany, matthew
- **English (UK)**: amy
- **Spanish (ES)**: lupe, carlos

### Event Flow
1. Client connects via Socket.IO
2. Server receives `promptStart` with voice configuration
3. Server receives `systemPrompt` with conversation context
4. Server receives `audioStart` to begin streaming
5. Client streams audio via `audioInput` events
6. Server responds with `textOutput` and `audioOutput` events
7. Client sends `stopAudio` to end the session gracefully

### Generation Stages
Nova Sonic supports two text generation stages:
- **SPECULATIVE**: Preliminary text output while processing
- **FINAL**: Final, confirmed text output

These stages are included in the `additionalModelFields` of the `contentStart` event.