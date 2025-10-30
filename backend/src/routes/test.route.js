import express from 'express';
import { testAI } from '../controllers/test.controller.js';

const router = express.Router();


router.post('/test-ai', testAI);


export default router;
