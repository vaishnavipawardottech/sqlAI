import { getModel } from '../../config/gemini.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import chatManager from '../services/chatManager.js';
import { buildPromptWithContext, extractTableName, cleanSqlResponse, detectIntent, extractAllTableNames } from '../utils/promptBuilder.js';

// ==========================================
// CHAT SESSION ENDPOINTS
// ==========================================

// Create a new chat
const createNewChat = asyncHandler(async (req, res) => {
    try {
        const { chatTitle } = req.body;
        const userId = req.user.id;
        
        const sessionId = await chatManager.createNewChat(userId, chatTitle);
        
        return res.json({
            success: true,
            message: 'New chat created',
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('❌ Error creating chat:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create new chat',
            error: error.message
        });
    }
});

// Get all chats for a user
const getAllChats = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        
        const chats = await chatManager.getAllChats(userId);
        
        return res.json({
            success: true,
            chats: chats
        });
        
    } catch (error) {
        console.error('❌ Error fetching chats:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch chats',
            error: error.message
        });
    }
});

// Get specific chat details with full history
const getChatDetails = asyncHandler(async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        
        const session = await chatManager.getChatSession(sessionId, userId);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }
        
        const context = await chatManager.getFullContext(sessionId);
        const allMessages = await chatManager.getAllMessages(sessionId);
        
        return res.json({
            success: true,
            chat: {
                sessionId: session.session_id,
                title: session.chat_title,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            },
            schemas: context.schemas,
            queries: context.queries,
            messages: allMessages
        });
        
    } catch (error) {
        console.error('❌ Error fetching chat details:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch chat details',
            error: error.message
        });
    }
});

// Update chat title
const updateChatTitle = asyncHandler(async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { newTitle } = req.body;
        const userId = req.user.id;
        
        // Verify ownership
        const session = await chatManager.getChatSession(sessionId, userId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }
        
        await chatManager.updateChatTitle(sessionId, newTitle);
        
        return res.json({
            success: true,
            message: 'Chat title updated'
        });
        
    } catch (error) {
        console.error('❌ Error updating title:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update chat title',
            error: error.message
        });
    }
});

// Delete chat
const deleteChat = asyncHandler(async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        
        await chatManager.deleteChat(sessionId, userId);
        
        return res.json({
            success: true,
            message: 'Chat deleted'
        });
        
    } catch (error) {
        console.error('❌ Error deleting chat:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete chat',
            error: error.message
        });
    }
});

// ==========================================
// SCHEMA GENERATION (Per Chat)
// ==========================================
const generateSchema = asyncHandler(async (req, res) => {
    try {
        const { description, sessionId } = req.body;
        const userId = req.user.id;
        
        if (!description || description.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a business description'
            });
        }

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }
        
        // Verify session belongs to user
        const session = await chatManager.getChatSession(sessionId, userId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Chat session not found'
            });
        }
        
        console.log(`📝 Generating schema in chat ${sessionId}:`, description);
        
        // Get context for THIS SPECIFIC CHAT
        const context = await chatManager.getFullContext(sessionId);
        
        // Build prompt with context
        const prompt = buildPromptWithContext(description, context, 'schema');
        
        // Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const model = getModel();
        const result = await model.generateContent(prompt);
        const response = result.response;
        let sqlStatements = cleanSqlResponse(response.text());
        
        // Extract table name
        const tableName = extractTableName(sqlStatements);
        
        // Save to THIS CHAT's context
        await chatManager.addMessage(sessionId, 'user', description);
        await chatManager.addMessage(sessionId, 'assistant', sqlStatements);
        await chatManager.addSchema(sessionId, tableName, sqlStatements, description);
        
        // Auto-generate title if first message
        if (context.messages.length === 0) {
            await chatManager.autoGenerateChatTitle(sessionId, description);
        }
        
        console.log('✅ Schema generated and saved to chat');
        
        return res.json({
            success: true,
            sql: sqlStatements,
            tableName: tableName,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('❌ Schema generation error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate schema',
            error: error.message
        });
    }
});

// ==========================================
// QUERY GENERATION (Per Chat)
// ==========================================
const generateQuery = asyncHandler(async (req, res) => {
    try {
        const { description, sessionId } = req.body;
        const userId = req.user.id;
        
        if (!description || description.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a query description'
            });
        }

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }
        
        // Verify session belongs to user
        const session = await chatManager.getChatSession(sessionId, userId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Chat session not found'
            });
        }
        
        console.log(`🔍 Generating query in chat ${sessionId}:`, description);
        
        // Get context for THIS SPECIFIC CHAT
        const context = await chatManager.getFullContext(sessionId);
        
        // Check if schema exists in THIS CHAT
        if (context.schemas.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No schema found in this chat. Please create a schema first.',
                needsSchema: true
            });
        }
        
        // Build prompt with context
        const prompt = buildPromptWithContext(description, context, 'query');
        
        // Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const model = getModel();
        const result = await model.generateContent(prompt);
        const response = result.response;
        let sqlQuery = cleanSqlResponse(response.text());
        
        if (!sqlQuery.endsWith(';')) {
            sqlQuery += ';';
        }
        
        // Save to THIS CHAT's context
        await chatManager.addMessage(sessionId, 'user', description);
        await chatManager.addMessage(sessionId, 'assistant', sqlQuery);
        await chatManager.addQuery(sessionId, description, sqlQuery);
        
        // Auto-generate title if first message
        if (context.messages.length === 0) {
            await chatManager.autoGenerateChatTitle(sessionId, description);
        }
        
        console.log('✅ Query generated and saved to chat');
        
        return res.json({
            success: true,
            sql: sqlQuery,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('❌ Query generation error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate query',
            error: error.message
        });
    }
});

const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user.id;
        
        // Validate input
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a message'
            });
        }

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }
        
        // Verify session belongs to user
        const session = await chatManager.getChatSession(sessionId, userId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Chat session not found'
            });
        }
        
        console.log(`💬 Processing message in chat ${sessionId}:`, message);
        
        // Get context for this chat
        const context = await chatManager.getFullContext(sessionId);
        
        // Detect intent automatically
        const intent = detectIntent(message, context);
        console.log(`🎯 Detected intent: ${intent}`);
        
        // Build prompt with context
        const prompt = buildPromptWithContext(message, context, intent);
        
        // Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const model = getModel();
        const result = await model.generateContent(prompt);
        const response = result.response;
        let aiResponse = cleanSqlResponse(response.text());
        
        // Validate AI response
        if (!aiResponse || aiResponse.trim() === '') {
            return res.status(500).json({
                success: false,
                message: 'AI failed to generate a response. Please try again.',
                intent: intent
            });
        }
        
        // Save user message
        await chatManager.addMessage(sessionId, 'user', message);
        
        // Prepare response data
        let responseData = {
            success: true,
            sessionId: sessionId,
            intent: intent,
            response: aiResponse
        };
        
        // Process based on intent
        switch (intent) {
            case 'schema':
            case 'optimize_schema':
                if (aiResponse && aiResponse.length > 10) {
                    const tableNames = extractAllTableNames(aiResponse);
                    const primaryTable = tableNames[0] || extractTableName(aiResponse);
                    
                    // Save schema to database
                    await chatManager.addSchema(sessionId, primaryTable, aiResponse, message);
                    
                    responseData.type = 'schema';
                    responseData.sql = aiResponse;
                    responseData.tableName = primaryTable;
                    responseData.allTables = tableNames;
                    
                    console.log(`✅ Schema saved: ${primaryTable}`);
                } else {
                    responseData.type = 'error';
                    responseData.message = 'Could not generate schema. Please provide more details about your database structure.';
                }
                break;
                
            case 'query':
            case 'optimize_query':
                if (aiResponse && aiResponse.length > 5) {
                    // Ensure query ends with semicolon
                    if (!aiResponse.endsWith(';')) {
                        aiResponse += ';';
                    }
                    
                    // Save query to database
                    await chatManager.addQuery(sessionId, message, aiResponse);
                    
                    responseData.type = 'query';
                    responseData.sql = aiResponse;
                    
                    console.log(`✅ Query saved`);
                } else {
                    responseData.type = 'error';
                    responseData.message = 'Could not generate query. Please check your request or ensure a schema exists.';
                }
                break;
                
            case 'conversation':
                responseData.type = 'conversation';
                responseData.text = aiResponse;
                
                console.log(`✅ Conversational response generated`);
                break;
                
            default:
                responseData.type = 'conversation';
                responseData.text = aiResponse;
        }
        
        // Save assistant response
        await chatManager.addMessage(sessionId, 'assistant', aiResponse);
        
        // Auto-generate title if this is the first message
        if (context.messages.length === 0) {
            await chatManager.autoGenerateChatTitle(sessionId, message);
        }
        
        console.log(`✅ Message processed successfully (${intent})`);
        
        return res.json(responseData);
        
    } catch (error) {
        console.error('❌ Message processing error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process message',
            error: error.message
        });
    }
});

export { 
    createNewChat, 
    getAllChats, 
    getChatDetails, 
    updateChatTitle, 
    deleteChat,
    generateSchema, 
    generateQuery,
    sendMessage 
};