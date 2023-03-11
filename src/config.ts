import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
    openaiApiKey: process.env.OPENAI_API_KEY,
} as const;