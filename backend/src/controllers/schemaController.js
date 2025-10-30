import { getModel } from '../../config/gemini.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ==========================================
// SCHEMA GENERATION CONTROLLER
// ==========================================
// When user clicks "Schema Mode" and enters business logic
const generateSchema = asyncHandler(async (req, res) => {
    try {
        const { description } = req.body;
        
        // Validation
        if (!description || description.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a business description'
            });
        }
        
        console.log('📝 Generating schema for:', description);
        
        const model = getModel();
        
        // Improved prompt for better schema generation
        const prompt = `You are an expert database architect. Generate a complete MySQL database schema.

Business Requirement:
${description}

Generate CREATE TABLE statements with:
- Primary keys (customer_id, product_id, order_id, etc.)
- Foreign keys with REFERENCES
- Appropriate data types (INTEGER, TEXT, DECIMAL, DATE)
- NOT NULL constraints where needed
- UNIQUE constraints where needed

Return ONLY the SQL statements, no explanations.
Each CREATE TABLE should be complete and properly formatted.
Separate tables with blank lines.

Example format:
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATE
);

CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    total DECIMAL(10,2)
);

Now generate the complete schema:`;

        // Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const result = await model.generateContent(prompt);
        const response = result.response;
        let sqlStatements = response.text();
        
        // Clean up the response - remove markdown if present
        // sqlStatements = sqlStatements
        //     .replace(/```sql/g, '')
        //     .replace(/```/g, '')
        //     .trim();
        
        console.log('✅ Schema generated successfully');
        
        // Return only the SQL
        return res.json({
            success: true,
            sql: sqlStatements
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
// GENERAL Q&A CONTROLLER
// ==========================================
// Answer any question the user asks
const askQuestion = asyncHandler(async (req, res) => {
    try {
        const { question } = req.body;
        
        // Validation
        if (!question || question.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a question'
            });
        }
        
        console.log('💬 Answering question:', question);
        
        const model = getModel();
        
        // Simple prompt for general Q&A
        const prompt = `Answer this question clearly and concisely:

${question}

Provide a helpful, accurate answer.`;

        // Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const result = await model.generateContent(prompt);
        const response = result.response;
        const answer = response.text();
        
        console.log('✅ Answer generated successfully');
        
        // Return the answer
        return res.json({
            success: true,
            question: question,
            answer: answer
        });
        
    } catch (error) {
        console.error('❌ Q&A error:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to answer question',
            error: error.message
        });
    }
});

export { generateSchema, askQuestion };
