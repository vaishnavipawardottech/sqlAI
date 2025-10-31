import express from 'express';
import { createNewChat, getAllChats, getChatDetails, updateChatTitle, deleteChat, sendMessage } from '../controllers/chatController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/new', authenticateToken, createNewChat);
router.get('/all/:userId', authenticateToken, getAllChats);
router.get('/:sessionId', authenticateToken, getChatDetails);
router.put('/:sessionId/title', authenticateToken, updateChatTitle);
router.delete('/:sessionId', authenticateToken, deleteChat);

router.post('/message', authenticateToken, sendMessage);

// router.post('/schema', authenticateToken, generateSchema);
// router.post('/query', authenticateToken, generateQuery);

export default router;
