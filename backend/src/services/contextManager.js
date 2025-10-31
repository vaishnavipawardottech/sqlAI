import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

class ContextManager {
    
    // Get or create a session for the user
    async getOrCreateSession(userId) {
        try {
            // Check for recent session (last 24 hours)
            const [sessions] = await pool.execute(
                `SELECT session_id FROM conversations 
                 WHERE user_id = ? 
                 AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 ORDER BY updated_at DESC 
                 LIMIT 1`,
                [userId]
            );

            if (sessions.length > 0) {
                return sessions[0].session_id;
            }

            // Create new session
            const sessionId = uuidv4();
            await pool.execute(
                `INSERT INTO conversations (user_id, session_id) VALUES (?, ?)`,
                [userId, sessionId]
            );

            return sessionId;
        } catch (error) {
            console.error('❌ Error in getOrCreateSession:', error);
            throw error;
        }
    }

    // Add a message to the conversation
    async addMessage(sessionId, role, content) {
        try {
            await pool.execute(
                `INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)`,
                [sessionId, role, content]
            );
        } catch (error) {
            console.error('❌ Error adding message:', error);
            throw error;
        }
    }

    // Add a schema to the session
    async addSchema(sessionId, tableName, sqlStatement, description) {
        try {
            await pool.execute(
                `INSERT INTO generated_schemas (session_id, table_name, sql_statement, description) 
                 VALUES (?, ?, ?, ?)`,
                [sessionId, tableName, sqlStatement, description]
            );
        } catch (error) {
            console.error('❌ Error adding schema:', error);
            throw error;
        }
    }

    // Add a query to the session
    async addQuery(sessionId, naturalLanguage, generatedSql) {
        try {
            await pool.execute(
                `INSERT INTO queries (session_id, natural_language, generated_sql) 
                 VALUES (?, ?, ?)`,
                [sessionId, naturalLanguage, generatedSql]
            );
        } catch (error) {
            console.error('❌ Error adding query:', error);
            throw error;
        }
    }

    // Get all schemas for a session
    async getSchemas(sessionId) {
        try {
            const [schemas] = await pool.execute(
                `SELECT table_name, sql_statement, description, created_at 
                 FROM generated_schemas
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

    // Get recent queries (last 5)
    async getRecentQueries(sessionId) {
        try {
            const [queries] = await pool.execute(
                `SELECT natural_language, generated_sql, created_at 
                 FROM queries 
                 WHERE session_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 5`,
                [sessionId]
            );
            return queries.reverse(); // Oldest first
        } catch (error) {
            console.error('❌ Error getting queries:', error);
            return [];
        }
    }

    // Get recent messages (last 10)
    async getRecentMessages(sessionId) {
        try {
            const [messages] = await pool.execute(
                `SELECT role, content, created_at 
                 FROM messages 
                 WHERE session_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 10`,
                [sessionId]
            );
            return messages.reverse(); // Oldest first
        } catch (error) {
            console.error('❌ Error getting messages:', error);
            return [];
        }
    }

    // Get full context for AI
    async getFullContext(sessionId) {
        const schemas = await this.getSchemas(sessionId);
        const queries = await this.getRecentQueries(sessionId);
        const messages = await this.getRecentMessages(sessionId);

        return { schemas, queries, messages };
    }
}

export default new ContextManager();