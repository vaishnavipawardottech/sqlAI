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







export { app };