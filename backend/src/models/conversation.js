// import { pool } from '../db/index.js';

// // Create conversations table
// const createConversationTable = async () => {
//     try {
//         // Main conversation sessions table
//         await pool.execute(
//             `CREATE TABLE IF NOT EXISTS conversations (
//                 id INT AUTO_INCREMENT PRIMARY KEY,
//                 user_id INT NOT NULL,
//                 session_id VARCHAR(100) UNIQUE NOT NULL,
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//                 FOREIGN KEY (user_id) REFERENCES users(id)
//             );`
//         );

//         // Store chat messages
//         await pool.execute(
//             `CREATE TABLE IF NOT EXISTS messages (
//                 id INT AUTO_INCREMENT PRIMARY KEY,
//                 session_id VARCHAR(100) NOT NULL,
//                 role ENUM('system', 'user', 'assistant') NOT NULL,
//                 content TEXT NOT NULL,
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 FOREIGN KEY (session_id) REFERENCES conversations(session_id)
//             );`
//         );

//         // Store generated schemas
//         await pool.execute(
//             `CREATE TABLE IF NOT EXISTS generated_schemas (
//                 id INT AUTO_INCREMENT PRIMARY KEY,
//                 session_id VARCHAR(100) NOT NULL,
//                 table_name VARCHAR(100) NOT NULL,
//                 sql_statement TEXT NOT NULL,
//                 description TEXT,
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 FOREIGN KEY (session_id) REFERENCES conversations(session_id)
//             );`
//         );

//         // Store generated queries
//         await pool.execute(
//             `CREATE TABLE IF NOT EXISTS queries (
//                 id INT AUTO_INCREMENT PRIMARY KEY,
//                 session_id VARCHAR(100) NOT NULL,
//                 natural_language TEXT NOT NULL,
//                 generated_sql TEXT NOT NULL,
//                 was_executed BOOLEAN DEFAULT FALSE,
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 FOREIGN KEY (session_id) REFERENCES conversations(session_id)
//             );`
//         );

//         console.log('✅ Conversation tables created successfully');
//     } catch (error) {
//         console.log("❌ Error creating conversation tables:", error);
//     }
// };

// export { createConversationTable };


import { pool } from '../db/index.js';

const createConversationTable = async () => {
    try {
        // Chat sessions table - Each chat is independent
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS chat_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                session_id VARCHAR(100) UNIQUE NOT NULL,
                chat_title VARCHAR(255) DEFAULT 'New Chat',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );`
        );

        // Messages in each chat
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(100) NOT NULL,
                role ENUM('system', 'user', 'assistant') NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
                INDEX idx_session_time (session_id, created_at)
            );`
        );

        // Schemas created in each chat
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS chat_schemas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(100) NOT NULL,
                table_name VARCHAR(100) NOT NULL,
                sql_statement TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
                INDEX idx_session_table (session_id, table_name)
            );`
        );

        // Queries generated in each chat
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS chat_queries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(100) NOT NULL,
                natural_language TEXT NOT NULL,
                generated_sql TEXT NOT NULL,
                was_executed BOOLEAN DEFAULT FALSE,
                execution_result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
                INDEX idx_session_time (session_id, created_at)
            );`
        );

        console.log('✅ Chat tables created successfully');
    } catch (error) {
        console.log("❌ Error creating chat tables:", error);
    }
};

export { createConversationTable };