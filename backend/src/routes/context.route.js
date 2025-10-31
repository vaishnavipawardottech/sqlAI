import express from 'express';
import { generateSchemaWithContext, generateQueryWithContext, getConversationHistory } from '../controllers/contextController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();


router.post('/schema', authenticateToken, generateSchemaWithContext);
router.post('/query', authenticateToken, generateQueryWithContext);
router.get('/history/:userId', getConversationHistory);

export default router;
