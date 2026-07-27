#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, '..', 'dist', 'cli', 'audittest.js');

await import(pathToFileURL(cliPath).href);
