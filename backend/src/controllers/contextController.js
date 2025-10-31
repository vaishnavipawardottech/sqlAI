import { getModel } from '../../config/gemini.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import contextManager from '../services/contextManager.js';
import { buildPromptWithContext, extractTableName, cleanSqlResponse } from '../utils/promptBuilder.js';

// ==========================================
// SCHEMA GENERATION WITH CONTEXT
// ==========================================
const generateSchemaWithContext = asyncHandler(async (req, res) => {
    try {
        const { description } = req.body;
        const userId = req.user.id;

        if (!description || description.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a business description'
            });
        }
        
        console.log('📝 Generating schema with context for:', description);
        
        // 1. Get or create session
        const sessionId = await contextManager.getOrCreateSession(userId);
        
        // 2. Get context
        const context = await contextManager.getFullContext(sessionId);
        
        // 3. Build prompt with context
        const prompt = buildPromptWithContext(description, context, 'schema');
        
        // 4. Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const model = getModel();
        const result = await model.generateContent(prompt);
        const response = result.response;

        console.log("🧠 Gemini raw response:", response.text());

        let sqlStatements = cleanSqlResponse(response.text());
        
        // 5. Extract table name
        const tableName = extractTableName(sqlStatements);
        
        // 6. Save to context
        await contextManager.addMessage(sessionId, 'user', description);
        await contextManager.addMessage(sessionId, 'assistant', sqlStatements);
        await contextManager.addSchema(sessionId, tableName, sqlStatements, description);
        
        console.log('✅ Schema generated and saved to context');
        
        return res.json({
            success: true,
            sql: sqlStatements,
            sessionId: sessionId,
            tableName: tableName
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
// QUERY GENERATION WITH CONTEXT
// ==========================================
const generateQueryWithContext = asyncHandler(async (req, res) => {
    try {
        const { description } = req.body;
        const userId = req.user.id;
        
        if (!description || description.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a query description'
            });
        }
        
        console.log('🔍 Generating query with context for:', description);
        
        // 1. Get or create session
        const sessionId = await contextManager.getOrCreateSession(userId);
        
        // 2. Get context
        const context = await contextManager.getFullContext(sessionId);
        
        // 3. Check if schema exists
        if (context.schemas.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No schema found. Please create a schema first.',
                needsSchema: true
            });
        }
        
        // 4. Build prompt with context
        const prompt = buildPromptWithContext(description, context, 'query');
        
        // 5. Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const model = getModel();
        const result = await model.generateContent(prompt);
        const response = result.response;
        let sqlQuery = cleanSqlResponse(response.text());
        
        if (!sqlQuery.endsWith(';')) {
            sqlQuery += ';';
        }
        
        // 6. Save to context
        await contextManager.addMessage(sessionId, 'user', description);
        await contextManager.addMessage(sessionId, 'assistant', sqlQuery);
        await contextManager.addQuery(sessionId, description, sqlQuery);
        
        console.log('✅ Query generated and saved to context');
        
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

// ==========================================
// GET CONVERSATION HISTORY
// ==========================================
const getConversationHistory = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        
        const sessionId = await contextManager.getOrCreateSession(userId);
        const context = await contextManager.getFullContext(sessionId);
        
        return res.json({
            success: true,
            sessionId: sessionId,
            schemas: context.schemas,
            queries: context.queries,
            messages: context.messages
        });
        
    } catch (error) {
        console.error('❌ Error fetching history:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation history',
            error: error.message
        });
    }
});

export { generateSchemaWithContext, generateQueryWithContext, getConversationHistory };