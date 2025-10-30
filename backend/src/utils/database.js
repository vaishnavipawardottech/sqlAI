import { pool } from '../db/index.js';

// Creates required tables if they don't exist
const createTable = async () => {
    try {

        // Stores user-generated schemas
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS user_schemas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                schema_name VARCHAR(255) NOT NULL,
                description TEXT,
                sql_statements LONGTEXT NOT NULL,
                tables_metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`
        );
        console.log("✅ user_schemas table ready");

        // Stores query history with execution results
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS query_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                schema_id INT,
                natural_language_input TEXT NOT NULL,
                generated_sql LONGTEXT NOT NULL,
                query_type ENUM('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'OTHER') DEFAULT 'SELECT',
                execution_result JSON,
                execution_status ENUM('success', 'error', 'not_executed') DEFAULT 'not_executed',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (schema_id) REFERENCES user_schemas(id) ON DELETE CASCADE
            )`
        );
        console.log("✅ query_history table ready");

        // Stores generated sample data info
        await pool.execute(
            `CREATE TABLE IF NOT EXISTS sample_data_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                schema_id INT,
                table_name VARCHAR(255) NOT NULL,
                rows_generated INT,
                generation_prompt TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (schema_id) REFERENCES user_schemas(id) ON DELETE CASCADE
            )`
        );
        console.log("✅ sample_data_logs table ready");
    } catch (error) {
        console.log("something went wrong while creating the tables: ", error);
    }

};

export {createTable};
