import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
    openaiApiKey: required('OPENAI_API_KEY', process.env.OPENAI_API_KEY),
    dbFile: required('DB_FILE', process.env.DB_FILE),
} as const;

function required(key: string, value: string | undefined): string {
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value;
}