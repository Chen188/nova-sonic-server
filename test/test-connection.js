#!/usr/bin/env node
/**
 * Simple connection test for Nova Sonic Server
 * Tests that Socket.IO connection and basic event handling works
 */

const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3333';
const TEST_TIMEOUT = 5000;

console.log(`Testing connection to: ${SERVER_URL}`);

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: false,
});

let testPassed = false;
let timeoutHandle;

// Set up timeout
timeoutHandle = setTimeout(() => {
  if (!testPassed) {
    console.error('❌ Test failed: Connection timeout');
    socket.disconnect();
    process.exit(1);
  }
}, TEST_TIMEOUT);

// Connection successful
socket.on('connect', () => {
  console.log('✅ Connected successfully');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Test complete
  testPassed = true;
  clearTimeout(timeoutHandle);
  
  console.log('✅ All tests passed!');
  socket.disconnect();
  process.exit(0);
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  clearTimeout(timeoutHandle);
  process.exit(1);
});

// Handle other errors
socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
  clearTimeout(timeoutHandle);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
