import { SonarQubeError } from './types.js';
import axios from 'axios';

export function isSonarQubeError(error: unknown): error is SonarQubeError {
    return axios.isAxiosError(error) && 
           error.message !== undefined &&
           error.response?.data?.errors !== undefined;
}

export function formatSonarQubeError(error: unknown): string {
    if (isSonarQubeError(error)) {
        return `SonarQube API Error: ${error.response?.data?.errors?.[0]?.msg || error.message}`;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unknown error occurred';
}
