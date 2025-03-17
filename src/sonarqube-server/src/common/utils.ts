import axios from 'axios';

const SONAR_URL = process.env.SONAR_URL || 'http://localhost:9000';
const SONAR_TOKEN = process.env.SONAR_TOKEN;

if (!SONAR_TOKEN) {
  throw new Error('SONAR_TOKEN environment variable is required');
}

export const axiosInstance = axios.create({
  baseURL: SONAR_URL,
  headers: {
    'Authorization': `Bearer ${SONAR_TOKEN}`,
  },
});

export async function makeRequest(endpoint: string, params?: Record<string, any>) {
  try {
    const response = await axiosInstance.get(endpoint, { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SonarQube API Error: ${error.response?.data?.errors?.[0]?.msg || error.message}`);
    }
    throw error;
  }
}

export async function makePostRequest(endpoint: string, params?: Record<string, any>) {
  try {
    const response = await axiosInstance.post(endpoint, null, { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`SonarQube API Error: ${error.response?.data?.errors?.[0]?.msg || error.message}`);
    }
    throw error;
  }
}
