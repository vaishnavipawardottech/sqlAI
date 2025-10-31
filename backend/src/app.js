import express from 'express';
import cors from 'cors';


const app = express();

app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }
))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// imports
import apiRouter from './routes/api.js';
import testRouter from './routes/test.route.js';
import userRouter from './routes/user.route.js';
import contextRouter from './routes/context.route.js';

// API routes
app.use('/api', apiRouter);
app.use('/api', testRouter);
app.use('/api', userRouter);
app.use('/api', contextRouter);


export { app };