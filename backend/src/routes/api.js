import express from 'express';
import { generateSchema, askQuestion } from '../controllers/schemaController.js';
import { generateQuery } from '../controllers/queryController.js';

const router = express.Router();

// Schema Mode - Generate database schema
router.post('/generate-schema', generateSchema);

// Query Mode - Generate SQL query
router.post('/generate-query', generateQuery);

// Q&A Mode - Answer any question
router.post('/ask', askQuestion);

export default router;
