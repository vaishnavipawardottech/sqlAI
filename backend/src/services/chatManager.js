import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

class ChatManager {
    
    // ==========================================
    // CHAT SESSION MANAGEMENT
    // ==========================================
    
    // Create a new chat session
    async createNewChat(userId, chatTitle = 'New Chat') {
        try {
            const sessionId = uuidv4();
            
            await pool.execute(
                `INSERT INTO chat_sessions (user_id, session_id, chat_title) 
                 VALUES (?, ?, ?)`,
                [userId, sessionId, chatTitle]
            );

            console.log(`✅ New chat created: ${sessionId}`);
            return sessionId;
        } catch (error) {
            console.error('❌ Error creating new chat:', error);
            throw error;
        }
    }

    // Get all chats for a user
    async getAllChats(userId) {
        try {
            const [chats] = await pool.execute(
                `SELECT 
                    session_id, 
                    chat_title, 
                    is_active,
                    created_at, 
                    updated_at,
                    (SELECT COUNT(*) FROM chat_messages WHERE session_id = chat_sessions.session_id) as message_count,
                    (SELECT COUNT(*) FROM chat_schemas WHERE session_id = chat_sessions.session_id) as schema_count
                 FROM chat_sessions 
                 WHERE user_id = ? AND is_active = TRUE
                 ORDER BY updated_at DESC`,
                [userId]
            );

            return chats;
        } catch (error) {
            console.error('❌ Error getting chats:', error);
            return [];
        }
    }

    // Get a specific chat session
    async getChatSession(sessionId, userId) {
        try {
            const [sessions] = await pool.execute(
                `SELECT * FROM chat_sessions 
                 WHERE session_id = ? AND user_id = ? AND is_active = TRUE`,
                [sessionId, userId]
            );

            return sessions.length > 0 ? sessions[0] : null;
        } catch (error) {
            console.error('❌ Error getting chat session:', error);
            return null;
        }
    }

    // Update chat title
    async updateChatTitle(sessionId, newTitle) {
        try {
            await pool.execute(
                `UPDATE chat_sessions 
                 SET chat_title = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE session_id = ?`,
                [newTitle, sessionId]
            );
        } catch (error) {
            console.error('❌ Error updating chat title:', error);
        }
    }

    // Delete chat (soft delete)
    async deleteChat(sessionId, userId) {
        try {
            await pool.execute(
                `UPDATE chat_sessions 
                 SET is_active = FALSE 
                 WHERE session_id = ? AND user_id = ?`,
                [sessionId, userId]
            );
            console.log(`🗑️ Chat deleted: ${sessionId}`);
        } catch (error) {
            console.error('❌ Error deleting chat:', error);
            throw error;
        }
    }

    // ==========================================
    // CONTEXT MANAGEMENT (Per Chat)
    // ==========================================

    // Add a message to specific chat
    async addMessage(sessionId, role, content) {
        try {
            await pool.execute(
                `INSERT INTO chat_messages (session_id, role, content) 
                 VALUES (?, ?, ?)`,
                [sessionId, role, content]
            );

            // Update chat's updated_at timestamp
            await pool.execute(
                `UPDATE chat_sessions 
                 SET updated_at = CURRENT_TIMESTAMP 
                 WHERE session_id = ?`,
                [sessionId]
            );
        } catch (error) {
            console.error('❌ Error adding message:', error);
            throw error;
        }
    }

    // Add schema to specific chat
    async addSchema(sessionId, tableName, sqlStatement, description) {
        try {
            await pool.execute(
                `INSERT INTO chat_schemas (session_id, table_name, sql_statement, description) 
                 VALUES (?, ?, ?, ?)`,
                [sessionId, tableName, sqlStatement, description]
            );

            // Update chat timestamp
            await pool.execute(
                `UPDATE chat_sessions 
                 SET updated_at = CURRENT_TIMESTAMP 
                 WHERE session_id = ?`,
                [sessionId]
            );
        } catch (error) {
            console.error('❌ Error adding schema:', error);
            throw error;
        }
    }

    // Add query to specific chat
    async addQuery(sessionId, naturalLanguage, generatedSql, wasExecuted = false, result = null) {
        try {
            await pool.execute(
                `INSERT INTO chat_queries (session_id, natural_language, generated_sql, was_executed, execution_result) 
                 VALUES (?, ?, ?, ?, ?)`,
                [sessionId, naturalLanguage, generatedSql, wasExecuted, result]
            );

            // Update chat timestamp
            await pool.execute(
                `UPDATE chat_sessions 
                 SET updated_at = CURRENT_TIMESTAMP 
                 WHERE session_id = ?`,
                [sessionId]
            );
        } catch (error) {
            console.error('❌ Error adding query:', error);
            throw error;
        }
    }

    // ==========================================
    // GET CONTEXT FOR SPECIFIC CHAT
    // ==========================================

    // Get all schemas for a specific chat
    async getSchemas(sessionId) {
        try {
            const [schemas] = await pool.execute(
                `SELECT table_name, sql_statement, description, created_at 
                 FROM chat_schemas 
                 WHERE session_id = ? 
                 ORDER BY created_at ASC`,
                [sessionId]
            );
            return schemas;
        } catch (error) {
            console.error('❌ Error getting schemas:', error);
            return [];
        }
    }

    // Get recent queries for a specific chat (last 5)
    async getRecentQueries(sessionId, limit = 5) {
        try {
            const [queries] = await pool.execute(
                `SELECT natural_language, generated_sql, was_executed, created_at 
                 FROM chat_queries 
                 WHERE session_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [sessionId, limit]
            );
            return queries.reverse(); // Oldest first
        } catch (error) {
            console.error('❌ Error getting queries:', error);
            return [];
        }
    }

    // Get recent messages for a specific chat (last 10)
    async getRecentMessages(sessionId, limit = 10) {
        try {
            const [messages] = await pool.execute(
                `SELECT role, content, created_at 
                 FROM chat_messages 
                 WHERE session_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [sessionId, limit]
            );
            return messages.reverse(); // Oldest first
        } catch (error) {
            console.error('❌ Error getting messages:', error);
            return [];
        }
    }

    // Get all messages for a specific chat (for full history view)
    async getAllMessages(sessionId) {
        try {
            const [messages] = await pool.execute(
                `SELECT role, content, created_at 
                 FROM chat_messages 
                 WHERE session_id = ? 
                 ORDER BY created_at ASC`,
                [sessionId]
            );
            return messages;
        } catch (error) {
            console.error('❌ Error getting all messages:', error);
            return [];
        }
    }

    // Get full context for AI for a specific chat
    async getFullContext(sessionId) {
        const schemas = await this.getSchemas(sessionId);
        const queries = await this.getRecentQueries(sessionId);
        const messages = await this.getRecentMessages(sessionId);

        return { schemas, queries, messages };
    }

    // Auto-generate chat title from first message
    async autoGenerateChatTitle(sessionId, firstMessage) {
        try {
            // Take first 50 characters or first sentence
            let title = firstMessage.substring(0, 50);
            if (firstMessage.length > 50) {
                title += '...';
            }
            
            await this.updateChatTitle(sessionId, title);
        } catch (error) {
            console.error('❌ Error auto-generating title:', error);
        }
    }
}

export default new ChatManager();