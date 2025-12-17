#!/usr/bin/env node

import { argv, exit } from 'node:process';
import express from 'express';
import { createTileLoadingRouter } from './loader.js';

const baseServer = argv[2];
const port = argv[3] || 1503;
if (!baseServer) {
  console.error(`Missing base server parameter.`);
  exit(1);
}

const app = express();
app.set('trust proxy', 'loopback'); // need this
app.use(createTileLoadingRouter(baseServer));
app.listen(port, () => console.log(`Tile loader listening at http://load.${baseServer}:${port}/`));
