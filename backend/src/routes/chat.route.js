import express from 'express';
import { createNewChat, getAllChats, getChatDetails, updateChatTitle, deleteChat, sendMessage } from '../controllers/chatController.js';
import { setSingleUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply single-user middleware to all chat routes
router.use(setSingleUser);

router.post('/new', createNewChat);
router.get('/all/:userId', getAllChats);
router.get('/:sessionId', getChatDetails);
router.put('/:sessionId/title', updateChatTitle);
router.delete('/:sessionId', deleteChat);

router.post('/message', sendMessage);

// router.post('/schema', generateSchema);
// router.post('/query', generateQuery);

export default router;
