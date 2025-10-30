import { getModel } from '../../config/gemini.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Simple test endpoint to verify Gemini API is working
const testAI = asyncHandler(async (req, res) => {
    try {
        const model = getModel();
        
        // Static question for testing
        const prompt = "What is Node.js? Give me a short answer in 2 sentences.";
        
        console.log("📤 Sending prompt to Gemini:", prompt);
        
        // Call Gemini API
        const result = await model.generateContent(prompt);
        const response = result.response;
        const answer = response.text();
        
        console.log("Received answer from Gemini:", answer);
        
        // Return success response
        return res.json({
            success: true,
            prompt: prompt,
            answer: answer,
            model: 'gemini-2.5-flash',
            message: 'Gemini API is working!'
        });
        
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to connect to Gemini API. Check your GEMINI_API_KEY in .env file'
        });
    }
});

export { testAI };
