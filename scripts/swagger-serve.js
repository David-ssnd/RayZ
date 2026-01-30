#!/usr/bin/env node

// Simple wrapper to make swagger-ui-serve work with YAML files
const { spawn } = require('child_process');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const args = process.argv.slice(2);
const inputFile = args[0] || 'openapi.yaml';
const port = args[1] || '9090';

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

const ext = path.extname(inputFile);
let specFile = inputFile;

// Convert YAML to JSON if needed
if (ext === '.yaml' || ext === '.yml') {
  console.log(`Converting ${inputFile} to JSON...`);
  try {
    const fileContents = fs.readFileSync(inputFile, 'utf8');
    const spec = yaml.load(fileContents);
    const jsonFile = inputFile.replace(/\.ya?ml$/, '.json');
    fs.writeFileSync(jsonFile, JSON.stringify(spec, null, 2));
    specFile = jsonFile;
    console.log(`Created ${jsonFile}`);
  } catch (e) {
    console.error('Error converting YAML:', e.message);
    process.exit(1);
  }
}

// Detect if pnpm is available
const isPnpm = fs.existsSync('pnpm-lock.yaml') || process.env.npm_config_user_agent?.includes('pnpm');
const packageManager = isPnpm ? 'pnpm' : 'npx';
const execCommand = isPnpm ? 'dlx' : '';

// Start swagger-ui-serve with JSON file
console.log(`Starting Swagger UI on port ${port}...`);
const args_to_pass = execCommand ? [execCommand, 'swagger-ui-serve', '-p', port, specFile] : ['swagger-ui-serve', '-p', port, specFile];

const server = spawn(packageManager, args_to_pass, {
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  server.kill('SIGINT');
});
