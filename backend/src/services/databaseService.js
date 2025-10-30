// Purpose: All database CRUD operations
// Why separate? Clean architecture, reusable, testable

import { pool } from '../db/index.js';

class DatabaseService {
    
    // Save generated schema to database
    async saveSchema(schemaName, description, sqlStatements, metadata) {
        const query = `
            INSERT INTO user_schemas (schema_name, description, sql_statements, tables_metadata)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            schemaName,
            description,
            sqlStatements,
            JSON.stringify(metadata)
        ]);
        return result.insertId; // Return the ID of created schema
    }

    // Get the most recent schema (for context awareness!)
    async getLatestSchema() {
        const query = `
            SELECT * FROM user_schemas 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const [rows] = await pool.execute(query);
        return rows[0] || null;
    }

    // Get schema by ID
    async getSchemaById(id) {
        const query = `SELECT * FROM user_schemas WHERE id = ?`;
        const [rows] = await pool.execute(query, [id]);
        return rows[0] || null;
    }

    // Save query to history
    async saveQueryHistory(schemaId, nlInput, generatedSql, result, status) {
        const query = `
            INSERT INTO query_history 
            (schema_id, natural_language_input, generated_sql, execution_result, execution_status)
            VALUES (?, ?, ?, ?, ?)
        `;
        await pool.execute(query, [
            schemaId,
            nlInput,
            generatedSql,
            JSON.stringify(result),
            status
        ]);
    }

    // Execute user's generated schema (CREATE TABLES)
    async executeSchema(sqlStatements) {
        const statements = sqlStatements
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const results = [];
        for (const statement of statements) {
            try {
                await pool.execute(statement);
                results.push({ statement, status: 'success' });
            } catch (error) {
                results.push({ 
                    statement, 
                    status: 'error', 
                    error: error.message 
                });
            }
        }
        return results;
    }

    // Execute SELECT queries and return results
    async executeQuery(sqlQuery) {
        const [rows] = await pool.execute(sqlQuery);
        return rows;
    }

    // Generate sample data for a table (we'll use AI for this!)
    async insertSampleData(tableName, columns, sampleData) {
        const columnNames = columns.join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

        const results = [];
        for (const row of sampleData) {
            try {
                await pool.execute(query, row);
                results.push({ status: 'success', row });
            } catch (error) {
                results.push({ status: 'error', row, error: error.message });
            }
        }
        return results;
    }

    // Get table structure (for validation)
    async getTableStructure(tableName) {
        const query = `DESCRIBE ${tableName}`;
        const [rows] = await pool.execute(query);
        return rows;
    }

    // Check if table exists
    async tableExists(tableName) {
        const query = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = ?
        `;
        const [rows] = await pool.execute(query, [process.env.DB_NAME, tableName]);
        return rows[0].count > 0;
    }
}

export default new DatabaseService();