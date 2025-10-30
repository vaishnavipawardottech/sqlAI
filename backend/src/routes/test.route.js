import express from 'express';
import { testAI } from '../controllers/testController.js';

const router = express.Router();


router.post('/test-ai', testAI);


export default router;
