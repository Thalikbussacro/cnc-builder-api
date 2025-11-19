#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Find the correct dist directory
const possiblePaths = [
  path.join(__dirname, 'dist', 'server.js'),
  path.join(__dirname, '..', 'dist', 'server.js'),
  path.join(process.cwd(), 'dist', 'server.js'),
];

console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Searching for server.js in:');

let serverPath = null;
for (const p of possiblePaths) {
  console.log(' -', p, ':', fs.existsSync(p) ? 'EXISTS' : 'NOT FOUND');
  if (fs.existsSync(p)) {
    serverPath = p;
    break;
  }
}

if (!serverPath) {
  console.error('ERROR: Could not find dist/server.js');
  console.error('Directory contents:');
  try {
    const files = fs.readdirSync(process.cwd());
    console.log(files);
  } catch (e) {
    console.error('Could not read directory:', e.message);
  }
  process.exit(1);
}

console.log('Starting server from:', serverPath);
require(serverPath);
