import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Export model configurations
export const getModel = (modelName = 'gemini-1.5-flash') => {
    return genAI.getGenerativeModel({ model: modelName });
};

// Pro model for complex tasks (slower but better)
export const getProModel = () => {
    return genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
};

export default genAI;