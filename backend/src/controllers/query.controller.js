import { getModel } from '../../config/gemini.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ==========================================
// QUERY GENERATION CONTROLLER
// ==========================================
// When user clicks "Query Mode" and enters natural language query
const generateQuery = asyncHandler(async (req, res) => {
    try {
        const { description } = req.body;
        
        // Validation
        if (!description || description.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a query description'
            });
        }
        
        console.log('🔍 Generating SQL query for:', description);
        
        const model = getModel();
        
        // Improved prompt for better query generation
        const prompt = `You are an expert SQL developer. Convert this request into a MySQL query.

Request:
${description}

Generate a SELECT query with:
- Proper JOIN syntax if multiple tables
- WHERE clauses for filtering
- ORDER BY for sorting
- LIMIT for restricting results
- Meaningful column aliases

Return ONLY the SQL query, no explanations.

Example:
SELECT u.name, COUNT(o.order_id) as total_orders
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id
ORDER BY total_orders DESC
LIMIT 10;

Now generate the query:`;

        // Call Gemini AI
        console.log('🤖 Calling Gemini AI...');
        const result = await model.generateContent(prompt);
        const response = result.response;
        let sqlQuery = response.text();
        
        // Clean up the response
        // sqlQuery = sqlQuery
        //     .replace(/```sql/g, '')
        //     .replace(/```/g, '')
        //     .trim();
        
        // Ensure query ends with semicolon
        if (!sqlQuery.endsWith(';')) {
            sqlQuery += ';';
        }
        
        console.log('✅ Query generated successfully');
        
        // Return only the SQL
        return res.json({
            success: true,
            sql: sqlQuery
        });
        
    } catch (error) {
        console.error('❌ Query generation error:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to generate query',
            error: error.message
        });
    }
});

export { generateQuery };
