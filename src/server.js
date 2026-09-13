#!/usr/bin/env node
import http from 'node:http';

import { loadConfig } from './core/config.js';
import { createLogger } from './core/logger.js';
import { StreamHub } from './stream/hub.js';
import { handleRequest } from './events/routes.js';

const config = loadConfig(process.argv);
const logger = createLogger('info');

const hub = new StreamHub();

const server = http.createServer((req, res) => {
  handleRequest(req, res, { hub, logger });
});

server.listen(config.port, () => {
  logger.info(`tp1003 listening on http://127.0.0.1:${config.port}`);
});

process.on('SIGINT', () => {
  logger.info('interrupted, exiting');
  process.exit(0);
});
