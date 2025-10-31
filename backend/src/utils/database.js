import { pool } from '../db/index.js';
import { createConversationTable } from '../models/conversation.js';

// Creates required tables if they don't exist
const createTable = async () => {
    try {
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                refresh_token TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP DEFAULT NULL
            );`
        )

        await createConversationTable();

        console.log("All tables created successfully.");
        
        
    } catch (error) {
        console.log("something went wrong while creating the tables: ", error);
    }

};

export {createTable};
