#!/usr/bin/env node

import { argv, exit } from 'node:process';
import express from 'express';
import { createTileLoadingRouter } from './loader.js';

const baseServer = argv[1];
if (!baseServer) {
  console.error(`Missing base server parameter.`);
  exit(1);
}

const app = express();
app.set('trust proxy', 'loopback'); // need this
app.use(createTileLoadingRouter(baseServer));
