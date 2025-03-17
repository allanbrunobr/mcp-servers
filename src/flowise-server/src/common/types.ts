import { z } from 'zod';

// Schema for prediction input
export const PredictionSchema = z.object({
  question: z.string().describe('The question or input text to send to Flowise'),
  chatflowId: z.string().optional().describe('Optional specific chatflow ID to use'),
});

// Schema for chat history
export const ChatHistorySchema = z.object({
  chatflowId: z.string().describe('The chatflow ID to get history for'),
});

export type PredictionInput = z.infer<typeof PredictionSchema>;
export type ChatHistoryInput = z.infer<typeof ChatHistorySchema>;