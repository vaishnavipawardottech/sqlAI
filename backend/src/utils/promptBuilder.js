// // Build context-aware prompt for AI
// function buildPromptWithContext(userInput, context, type = 'query') {
//     const { schemas, queries, messages } = context;

//     // Build system message with schema context
//     let systemPrompt = `You are an expert SQL database assistant. You help users create MySQL schemas and write SQL queries.

// `;

//     // Add schema context if available
//     if (schemas.length > 0) {
//         systemPrompt += `CURRENT DATABASE SCHEMA:
// ${schemas.map(s => s.sql_statement).join('\n\n')}

// Available Tables: ${schemas.map(s => s.table_name).join(', ')}

// `;
//     } else {
//         systemPrompt += `No database schema has been created yet.\n\n`;
//     }

//     // Add recent queries context
//     if (queries.length > 0) {
//         systemPrompt += `RECENT QUERIES (for context):
// ${queries.map(q => `- "${q.natural_language}" → ${q.generated_sql}`).join('\n')}

// `;
//     }

//     // Build specific instructions based on type
//     if (type === 'schema') {
//         systemPrompt += `TASK: Generate a CREATE TABLE statement for MySQL.

// User Request: ${userInput}

// INSTRUCTIONS:
// - Use proper MySQL syntax
// - Include PRIMARY KEY
// - Add FOREIGN KEY if relationships exist with current tables
// - Use appropriate data types (INT, VARCHAR, TEXT, DECIMAL, DATE, TIMESTAMP)
// - Add NOT NULL, UNIQUE constraints where needed
// - Return ONLY the SQL statement, no explanations`;

//     } else if (type === 'query') {
//         systemPrompt += `TASK: Convert natural language to a MySQL SELECT query.

// User Request: ${userInput}

// INSTRUCTIONS:
// - Use ONLY the tables from the current schema
// - Use proper JOIN syntax if multiple tables are needed
// - Add WHERE, ORDER BY, LIMIT as requested
// - If this is a follow-up question (like "now show top 5" or "add where clause"), modify the previous query
// - Return ONLY the SQL query, no explanations`;
//     }

//     return systemPrompt;
// }

// // Extract table name from CREATE TABLE statement
// function extractTableName(sql) {
//     const match = sql.match(/CREATE TABLE\s+(\w+)/i);
//     return match ? match[1] : 'unknown_table';
// }

// // Clean SQL response from AI
// function cleanSqlResponse(text) {
//     return text
//         .replace(/```sql/gi, '')
//         .replace(/```/g, '')
//         .trim();
// }

// export { buildPromptWithContext, extractTableName, cleanSqlResponse };



// Detect the intent of user's message
function detectIntent(userInput, context) {
    const input = userInput.toLowerCase().trim();
    const { schemas, queries } = context;

    // Keywords for different intents
    const schemaKeywords = ['create table', 'schema', 'database design', 'table structure', 'design database'];
    const queryKeywords = ['select', 'query', 'get', 'find', 'show', 'list', 'fetch', 'retrieve'];
    const optimizeKeywords = ['optimize', 'improve', 'better', 'enhance', 'refactor', 'modify'];
    const conversationKeywords = ['what', 'how', 'why', 'tell me', 'explain', 'can you', 'should i', 'help me'];

    // Check for optimization intent
    if (optimizeKeywords.some(kw => input.includes(kw))) {
        if (input.includes('query') || input.includes('above') || input.includes('previous')) {
            return queries.length > 0 ? 'optimize_query' : 'conversation';
        }
        if (input.includes('schema') || input.includes('table')) {
            return schemas.length > 0 ? 'optimize_schema' : 'conversation';
        }
        // If just "optimize" and we have recent query, optimize that
        if (queries.length > 0) {
            return 'optimize_query';
        }
    }

    // Check for explicit schema creation
    if (schemaKeywords.some(kw => input.includes(kw))) {
        return 'schema';
    }

    // Check for query generation
    if (queryKeywords.some(kw => input.includes(kw)) && schemas.length > 0) {
        return 'query';
    }

    // If no schema exists and asking about queries, it's conversation
    if (queryKeywords.some(kw => input.includes(kw)) && schemas.length === 0) {
        return 'conversation';
    }

    // Conversational intent
    if (conversationKeywords.some(kw => input.includes(kw))) {
        return 'conversation';
    }

    // Default: if schema exists, treat as query, otherwise conversation
    return schemas.length > 0 ? 'query' : 'conversation';
}

// Build context-aware prompt for AI
function buildPromptWithContext(userInput, context, type = 'auto') {
    const { schemas, queries, messages } = context;

    // Auto-detect intent if type is 'auto'
    if (type === 'auto') {
        type = detectIntent(userInput, context);
    }

    let systemPrompt = `You are an expert SQL database assistant and helpful conversational AI.

`;

    // Add schema context if available
    if (schemas.length > 0) {
        systemPrompt += `CURRENT DATABASE SCHEMA:
${schemas.map(s => `-- ${s.description || 'Table: ' + s.table_name}\n${s.sql_statement}`).join('\n\n')}

Available Tables: ${schemas.map(s => s.table_name).join(', ')}

`;
    }

    // Add recent conversation history
    if (messages.length > 0) {
        systemPrompt += `RECENT CONVERSATION:
${messages.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 150)}`).join('\n')}

`;
    }

    // Add recent queries context
    if (queries.length > 0) {
        systemPrompt += `RECENT QUERIES:
${queries.slice(-3).map((q, i) => `${i + 1}. "${q.natural_language}"\n   SQL: ${q.generated_sql}`).join('\n\n')}

`;
    }

    // Build specific instructions based on detected type
    switch (type) {
        case 'schema':
            systemPrompt += `TASK: Generate CREATE TABLE statement(s) for MySQL.

User Request: ${userInput}

INSTRUCTIONS:
- Analyze the business requirement carefully
- Generate complete, production-ready MySQL table(s)
- Include PRIMARY KEY, FOREIGN KEY constraints
- Use appropriate data types (INT, VARCHAR, TEXT, DECIMAL, DATE, TIMESTAMP, ENUM)
- Add NOT NULL, UNIQUE, DEFAULT constraints where appropriate
- Add indexes for performance (INDEX on foreign keys)
- If multiple tables are needed, generate all of them
- Return ONLY the SQL statements, no markdown, no explanations`;
            break;

        case 'query':
            systemPrompt += `TASK: Convert natural language to a MySQL SELECT query.

User Request: ${userInput}

INSTRUCTIONS:
- Use ONLY the existing tables from the current schema
- Write optimized, production-ready SQL
- Use proper JOINs if multiple tables needed
- Add WHERE, GROUP BY, ORDER BY, LIMIT as appropriate
- Return ONLY the SQL query, no markdown, no explanations`;
            break;

        case 'optimize_query':
            const lastQuery = queries[queries.length - 1];
            systemPrompt += `TASK: Optimize the previous SQL query.

Original Query:
${lastQuery.generated_sql}

Original Request: ${lastQuery.natural_language}

User's Optimization Request: ${userInput}

INSTRUCTIONS:
- Improve the query based on user's request
- Add indexes suggestions if needed (as SQL comments)
- Optimize JOINs, subqueries, or add CTEs if beneficial
- Maintain the same result but improve performance
- Return ONLY the optimized SQL query, no markdown, no explanations`;
            break;

        case 'optimize_schema':
            const lastSchema = schemas[schemas.length - 1];
            systemPrompt += `TASK: Optimize the database schema.

Current Schema:
${lastSchema.sql_statement}

User's Optimization Request: ${userInput}

INSTRUCTIONS:
- Improve the schema based on user's request
- Add missing indexes, constraints, or relationships
- Suggest better data types if applicable
- Add normalization if needed
- Return ONLY the improved SQL statements, no markdown, no explanations`;
            break;

        case 'conversation':
            systemPrompt += `TASK: Have a helpful conversation about databases and SQL.

User Message: ${userInput}

INSTRUCTIONS:
- Be conversational, friendly, and helpful
- If user is planning to build something, ask clarifying questions
- If discussing database design, provide expert advice
- If user needs guidance, provide clear explanations
- Keep responses concise (2-3 paragraphs max)
- Don't generate SQL unless explicitly asked
- Return ONLY your response text, no special formatting`;
            break;

        default:
            systemPrompt += `User Message: ${userInput}

Respond appropriately to the user's request.`;
    }

    return systemPrompt;
}

// Extract table name from CREATE TABLE statement
function extractTableName(sql) {
    const match = sql.match(/CREATE TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
    return match ? match[1] : 'unknown_table';
}

// Clean SQL response from AI
function cleanSqlResponse(text) {
    return text
        .replace(/```sql/gi, '')
        .replace(/```/g, '')
        .trim();
}

// Extract all table names from multiple CREATE TABLE statements
function extractAllTableNames(sql) {
    const regex = /CREATE TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/gi;
    const matches = [...sql.matchAll(regex)];
    return matches.map(match => match[1]);
}

export { 
    buildPromptWithContext, 
    extractTableName, 
    cleanSqlResponse, 
    detectIntent,
    extractAllTableNames 
};