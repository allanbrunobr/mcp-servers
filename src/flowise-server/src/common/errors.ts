import { AxiosError } from 'axios';
import { z } from 'zod';

export function formatFlowiseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Invalid input: ${JSON.stringify(error.errors)}`;
  }
  if (error instanceof AxiosError) {
    return `Flowise API error: ${error.response?.data?.message || error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}