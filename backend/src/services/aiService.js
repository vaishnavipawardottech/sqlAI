// import dotenv from 'dotenv';
// dotenv.config();

// // NOTE: this file attempts to use @google/generative-ai if a GEMINI_API_KEY is present.
// // If you don't have a key yet, the methods return helpful error messages so the
// // rest of the backend can be tested and wired up.

// let client = null;
// let hasGemini = false;
// try {
//   // lazy import so module doesn't crash if SDK shape changes; it's optional
//   const mod = await import('@google/generative-ai');
//   // common names include TextServiceClient or GenerativeLanguage or similar.
//   // We'll try best-effort to pick a client if available.
//   const TextClient = mod.TextServiceClient || mod.TextGenerationClient || mod.TextGenerationService;
//   if (TextClient && process.env.GEMINI_API_KEY) {
//     client = new TextClient({ apiKey: process.env.GEMINI_API_KEY });
//     hasGemini = true;
//   }
// } catch (err) {
//   // SDK not available or import failed — we'll continue with fallback behavior
//   console.warn('Google generative-ai SDK not available or failed to import. AI calls will be disabled until GEMINI_API_KEY is configured.');
// }

// class AIService {
//   async generateSchema(description) {
//     if (!hasGemini) {
//       // Return a placeholder SQL so rest of the flow can be tested.
//       const sample = `-- GEMINI not configured: add GEMINI_API_KEY to backend/.env to enable real generation\nCREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
//       return { sql: sample, metadata: { tables: ['users'], statementCount: 1 }, tokensUsed: 0 };
//     }

//     // Example prompt; you can tune models and input format later
//     const prompt = `You are an expert MySQL architect. Generate CREATE TABLE statements for: ${description}\nReturn only SQL statements separated by semicolons.`;

//     try {
//       // Best-effort usage of the client. You may need to adapt this call depending on SDK version.
//       const resp = await client.generateText({ model: process.env.GEMINI_MODEL || 'models/text-bison-001', input: prompt });
//       const sql = resp?.output?.[0]?.content || resp?.candidates?.[0]?.content || String(resp);
//       const metadata = this.extractMetadata(sql);
//       return { sql: sql.trim(), metadata, tokensUsed: 0 };
//     } catch (err) {
//       throw new Error(`AI generation failed: ${err.message}`);
//     }
//   }

//   async generateQuery(nlQuestion, schemaContext = null) {
//     if (!hasGemini) {
//       // Simple fallback: return a basic SELECT on the first available table
//       const table = schemaContext?.metadata?.tables?.[0] || 'users';
//       const fallback = `SELECT * FROM ${table} LIMIT 10;`;
//       return { sql: fallback, tokensUsed: 0 };
//     }

//     let prompt = `You are an expert SQL writer for MySQL. Convert the following natural language request into an optimized SELECT query.\nRequest: ${nlQuestion}`;
//     if (schemaContext && schemaContext.metadata) {
//       prompt += `\nAvailable tables: ${JSON.stringify(schemaContext.metadata.tables)}`;
//     }

//     try {
//       const resp = await client.generateText({ model: process.env.GEMINI_MODEL || 'models/text-bison-001', input: prompt });
//       const sql = resp?.output?.[0]?.content || resp?.candidates?.[0]?.content || String(resp);
//       return { sql: sql.trim(), tokensUsed: 0 };
//     } catch (err) {
//       throw new Error(`AI query generation failed: ${err.message}`);
//     }
//   }

//   async generateSampleData(tableName, columns = [], rowCount = 10) {
//     if (!hasGemini) {
//       // simple mock data generator (deterministic) so sample insert flows can be tested
//       const rows = [];
//       for (let i = 1; i <= rowCount; i++) {
//         rows.push(columns.map((col) => (col.toLowerCase().includes('id') ? i : `${col}_sample_${i}`)));
//       }
//       return rows;
//     }

//     const prompt = `Generate ${rowCount} rows of JSON arrays for table ${tableName} with columns ${JSON.stringify(columns)}. Return only a JSON array of arrays.`;
//     try {
//       const resp = await client.generateText({ model: process.env.GEMINI_MODEL || 'models/text-bison-001', input: prompt });
//       const text = resp?.output?.[0]?.content || resp?.candidates?.[0]?.content || String(resp);
//       // best-effort parse
//       const parsed = JSON.parse(text);
//       return parsed;
//     } catch (err) {
//       throw new Error(`Sample data generation failed: ${err.message}`);
//     }
//   }

//   extractMetadata(sqlStatements) {
//     const tableRegex = /CREATE\s+TABLE\s+`?(\w+)`?/gi;
//     const tables = [];
//     let match;
//     while ((match = tableRegex.exec(sqlStatements)) !== null) {
//       tables.push(match[1]);
//     }
//     return { tables, statementCount: sqlStatements.split(';').filter(s => s.trim()).length, generatedAt: new Date().toISOString() };
//   }
// }

// export default new AIService();




import { getModel } from '../../config/gemini.js';

class AIService {

    // ==========================================
    // 1. SCHEMA GENERATION (Using FREE Flash model only!)
    // ==========================================
    async generateSchema(businessDescription) {
        const model = getModel(); // Use Flash (FREE tier)

        const prompt = `You are an expert MySQL database architect.

TASK: Generate a complete, production-ready database schema based on the business requirements.

BUSINESS REQUIREMENTS:
${businessDescription}

INSTRUCTIONS:
1. Create all necessary tables with proper relationships
2. Use MySQL syntax (INT, VARCHAR, TEXT, DATETIME, etc.)
3. Include:
   - Primary keys (id INT AUTO_INCREMENT PRIMARY KEY)
   - Foreign keys with proper constraints (ON DELETE CASCADE/SET NULL)
   - Appropriate indexes for performance
   - NOT NULL constraints where needed
   - DEFAULT values where appropriate
   - Timestamps (created_at, updated_at)
4. Use snake_case naming convention
5. Add SQL comments explaining each table's purpose
6. Consider normalization (avoid redundancy)

OUTPUT FORMAT:
Return ONLY valid SQL CREATE TABLE statements.
Separate each statement with semicolon and newline.
No markdown, no explanations outside SQL comments.

Example:
-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table  
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

Now generate the schema:`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const sqlText = response.text();

            // Extract metadata (table names for context)
            const metadata = this.extractSchemaMetadata(sqlText);

            return {
                success: true,
                sql: sqlText,
                metadata: metadata,
                model: 'gemini-1.5-flash'  // FREE model
            };

        } catch (error) {
            console.error('Schema generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // 2. QUERY GENERATION (Context-Aware!)
    // ==========================================
    async generateQuery(naturalLanguageQuery, schemaContext = null) {
        const model = getModel(); // Use Flash for speed

        let prompt = `You are an expert MySQL query writer.

TASK: Convert the natural language question into an optimized SQL query.

NATURAL LANGUAGE QUERY:
${naturalLanguageQuery}

INSTRUCTIONS:
1. Generate ONLY SELECT queries (read-only for safety)
2. Use proper JOINs when querying multiple tables
3. Add appropriate WHERE, ORDER BY, LIMIT clauses
4. Optimize for performance (use indexes, avoid SELECT *)
5. Handle potential NULL values
6. Use meaningful aliases

OUTPUT FORMAT:
Return ONLY the SQL query, nothing else.
No markdown, no explanations, just pure SQL.

Example:
SELECT u.name, COUNT(o.id) as order_count 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
GROUP BY u.id 
ORDER BY order_count DESC 
LIMIT 10;
`;

        // Add schema context if available (KEY FEATURE!)
        if (schemaContext && schemaContext.tables) {
            prompt += `\n\nAVAILABLE SCHEMA CONTEXT:\n`;
            prompt += `Tables: ${schemaContext.tables.join(', ')}\n`;
            
            if (schemaContext.columns) {
                prompt += `\nTable Structures:\n${JSON.stringify(schemaContext.columns, null, 2)}\n`;
            }
            
            prompt += `\nUse ONLY these tables and columns in your query.\n`;
        }

        prompt += `\nNow generate the SQL query:`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const sqlQuery = response.text().trim();

            // Clean up any markdown formatting
            const cleanedSQL = sqlQuery
                .replace(/```sql/g, '')
                .replace(/```/g, '')
                .trim();

            return {
                success: true,
                sql: cleanedSQL,
                model: 'gemini-1.5-flash'
            };

        } catch (error) {
            console.error('Query generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // 3. SAMPLE DATA GENERATION
    // ==========================================
    async generateSampleData(tableName, tableStructure, rowCount = 10) {
        const model = getModel();

        const prompt = `You are a realistic test data generator.

TASK: Generate ${rowCount} rows of realistic sample data for a MySQL table.

TABLE: ${tableName}
STRUCTURE:
${JSON.stringify(tableStructure, null, 2)}

INSTRUCTIONS:
1. Generate realistic, varied data (not just "test1", "test2")
2. Respect data types and constraints
3. For foreign keys, use values that would exist (e.g., user_id: 1-10)
4. For emails, use realistic formats
5. For dates, use recent realistic dates
6. For prices/amounts, use realistic values
7. Create diverse data for testing different scenarios

OUTPUT FORMAT:
Return ONLY SQL INSERT statements.
Multiple rows in a single statement is preferred:

INSERT INTO ${tableName} (column1, column2, column3) VALUES
(value1, value2, value3),
(value1, value2, value3),
(value1, value2, value3);

No markdown, no explanations, just pure SQL.

Now generate ${rowCount} rows:`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const insertSQL = response.text().trim();

            const cleanedSQL = insertSQL
                .replace(/```sql/g, '')
                .replace(/```/g, '')
                .trim();

            return {
                success: true,
                sql: cleanedSQL,
                rowCount: rowCount,
                model: 'gemini-1.5-flash'
            };

        } catch (error) {
            console.error('Sample data generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // 4. SQL OPTIMIZATION ANALYSIS (Using FREE Flash model)
    // ==========================================
    async analyzeQueryOptimization(sqlQuery, tableStructures = []) {
        const model = getModel(); // Use Flash (FREE tier)

        const prompt = `You are a database performance expert.

TASK: Analyze the SQL query and provide optimization suggestions.

SQL QUERY:
${sqlQuery}

TABLE STRUCTURES:
${JSON.stringify(tableStructures, null, 2)}

ANALYZE FOR:
1. Missing indexes that could improve performance
2. Inefficient JOINs or subqueries
3. SELECT * usage (should specify columns)
4. Missing WHERE clauses on large tables
5. Opportunities for query rewriting
6. Potential performance bottlenecks

OUTPUT FORMAT (JSON):
{
    "severity": "low|medium|high",
    "issues": [
        {
            "type": "performance|syntax|best-practice",
            "message": "Clear description of the issue",
            "suggestion": "How to fix it",
            "priority": "low|medium|high"
        }
    ],
    "optimizedSQL": "Improved version of the query (if significant improvements possible)",
    "estimatedImpact": "Description of performance impact"
}

Return ONLY valid JSON, no markdown.`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const jsonText = response.text()
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const analysis = JSON.parse(jsonText);

            return {
                success: true,
                analysis: analysis,
                model: 'gemini-1.5-flash'  // FREE model
            };

        } catch (error) {
            console.error('Query analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ==========================================
    // HELPER: Extract Schema Metadata
    // ==========================================
    extractSchemaMetadata(sqlStatements) {
        const tables = [];
        const columns = {};

        // Extract table names
        const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/gi;
        let match;

        while ((match = tableRegex.exec(sqlStatements)) !== null) {
            const tableName = match[1];
            tables.push(tableName);

            // Extract columns for this table
            const tableBlock = this.extractTableBlock(sqlStatements, tableName);
            columns[tableName] = this.extractColumns(tableBlock);
        }

        return {
            tables: tables,
            columns: columns,
            tableCount: tables.length,
            generatedAt: new Date().toISOString()
        };
    }

    extractTableBlock(sql, tableName) {
        const regex = new RegExp(
            `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?\`?${tableName}\`?\\s*\\([^;]+\\);`,
            'is'
        );
        const match = sql.match(regex);
        return match ? match[0] : '';
    }

    extractColumns(tableBlock) {
        const columns = [];
        const columnRegex = /^\s*`?(\w+)`?\s+(\w+(?:\([^)]+\))?)/gm;
        let match;

        while ((match = columnRegex.exec(tableBlock)) !== null) {
            const columnName = match[1];
            const dataType = match[2];
            
            // Skip SQL keywords
            if (!['PRIMARY', 'FOREIGN', 'KEY', 'CONSTRAINT', 'INDEX'].includes(columnName.toUpperCase())) {
                columns.push({
                    name: columnName,
                    type: dataType
                });
            }
        }

        return columns;
    }
}

export default new AIService();
