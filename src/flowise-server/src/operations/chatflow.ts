import { z } from 'zod';
import { axiosInstance } from '../common/utils.js';

// Schema for creating a new chatflow
export const CreateChatflowSchema = z.object({
  name: z.string().describe('Name of the chatflow'),
});

export type CreateChatflowInput = z.infer<typeof CreateChatflowSchema>;

export async function createChatflow(args: CreateChatflowInput) {
  const flowData = {
    nodes: [],
    edges: [],
    viewport: {
      x: 0,
      y: 0,
      zoom: 1
    }
  };

  const response = await axiosInstance.post('/api/v1/chatflows', {
    name: args.name,
    flowData: JSON.stringify(flowData),
    deployed: false,
    isPublic: false,
    apikeyid: null,
    chatbotConfig: null,
    apiConfig: null,
    analytic: null,
    category: null,
    type: "CHAT"
  });
  
  return response.data;
}
