/**
 * Environment configuration and validation
 */
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as fs from 'fs';

// Get the directory path for loading the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../..'); // Only need to go up 3 levels from src/infrastructure/config

// Load environment variables from .env file
dotenv.config({ path: resolve(rootDir, '.env') });

// Provide debugging info for path resolution
console.debug('Environment config path:', __dirname);
console.debug('Root directory path:', rootDir); 
console.debug('.env path:', resolve(rootDir, '.env'));
console.debug('.env exists:', fs.existsSync(resolve(rootDir, '.env')));

// Configuration constants
export const RATE_LIMIT = 50; // requests per minute
export const RATE_WINDOW = 60000; // 1 minute in milliseconds
export const REQUEST_TIMEOUT = 10000; // 10 seconds

// Environment variable validation
const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is required. Please set it in your configuration.`);
  }
  return value;
};

// Export config values
export const config = {
  serperApiKey: getRequiredEnv('SERPER_API_KEY'),
  serperApiUrl: 'https://google.serper.dev',
  
  // OpenRouter config
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '', // Will be validated when used
  openRouterModel: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
  openRouterUrl: 'https://openrouter.ai/api/v1',
  
  // Research depth settings
  researchDepthSettings: {
    basic: { 
      maxSubQueries: 3, 
      maxSearchesPerQuery: 1,
      maxIterations: 5,
      temperature: 0.7
    },
    standard: { 
      maxSubQueries: 5, 
      maxSearchesPerQuery: 2,
      maxIterations: 10,
      temperature: 0.5
    },
    deep: { 
      maxSubQueries: 10, 
      maxSearchesPerQuery: 3,
      maxIterations: 20,
      temperature: 0.3
    }
  }
};
