// Build context-aware prompt for AI
function buildPromptWithContext(userInput, context, type = 'query') {
    const { schemas, queries, messages } = context;

    // Build system message with schema context
    let systemPrompt = `You are an expert SQL database assistant. You help users create MySQL schemas and write SQL queries.

`;

    // Add schema context if available
    if (schemas.length > 0) {
        systemPrompt += `CURRENT DATABASE SCHEMA:
${schemas.map(s => s.sql_statement).join('\n\n')}

Available Tables: ${schemas.map(s => s.table_name).join(', ')}

`;
    } else {
        systemPrompt += `No database schema has been created yet.\n\n`;
    }

    // Add recent queries context
    if (queries.length > 0) {
        systemPrompt += `RECENT QUERIES (for context):
${queries.map(q => `- "${q.natural_language}" → ${q.generated_sql}`).join('\n')}

`;
    }

    // Build specific instructions based on type
    if (type === 'schema') {
        systemPrompt += `TASK: Generate a CREATE TABLE statement for MySQL.

User Request: ${userInput}

INSTRUCTIONS:
- Use proper MySQL syntax
- Include PRIMARY KEY
- Add FOREIGN KEY if relationships exist with current tables
- Use appropriate data types (INT, VARCHAR, TEXT, DECIMAL, DATE, TIMESTAMP)
- Add NOT NULL, UNIQUE constraints where needed
- Return ONLY the SQL statement, no explanations`;

    } else if (type === 'query') {
        systemPrompt += `TASK: Convert natural language to a MySQL SELECT query.

User Request: ${userInput}

INSTRUCTIONS:
- Use ONLY the tables from the current schema
- Use proper JOIN syntax if multiple tables are needed
- Add WHERE, ORDER BY, LIMIT as requested
- If this is a follow-up question (like "now show top 5" or "add where clause"), modify the previous query
- Return ONLY the SQL query, no explanations`;
    }

    return systemPrompt;
}

// Extract table name from CREATE TABLE statement
function extractTableName(sql) {
    const match = sql.match(/CREATE TABLE\s+(\w+)/i);
    return match ? match[1] : 'unknown_table';
}

// Clean SQL response from AI
function cleanSqlResponse(text) {
    return text
        .replace(/```sql/gi, '')
        .replace(/```/g, '')
        .trim();
}

export { buildPromptWithContext, extractTableName, cleanSqlResponse };