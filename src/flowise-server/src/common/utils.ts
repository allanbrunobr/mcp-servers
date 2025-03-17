import axios from 'axios';

const API_KEY = process.env.FLOWISE_API_KEY;
if (!API_KEY) {
  throw new Error('FLOWISE_API_KEY environment variable is required');
}

const BASE_URL = process.env.FLOWISE_BASE_URL || 'http://localhost:3000';

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': API_KEY,
    'Content-Type': 'application/json',
  },
});
