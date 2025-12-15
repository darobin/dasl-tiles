
import express from 'express';

const app = express();
app.set('trust proxy', 'loopback'); // need this
