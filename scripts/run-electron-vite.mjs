#!/usr/bin/env node
// Wrapper that drops ELECTRON_RUN_AS_NODE before invoking electron-vite.
// Some shells/parents export this var to make `electron` behave as plain Node;
// keeping it set causes our app's main script to fail because the built-in
// `electron` module isn't injected into require().

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const isWin = process.platform === 'win32';
const cmd = isWin ? 'electron-vite.cmd' : 'electron-vite';
const bin = join(root, 'node_modules', '.bin', cmd);

const child = spawn(bin, args, { stdio: 'inherit', env, shell: isWin });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
