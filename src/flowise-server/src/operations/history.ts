import { axiosInstance } from '../common/utils.js';
import { ChatHistoryInput, ChatHistorySchema } from '../common/types.js';

export { ChatHistorySchema };

export async function getChatHistory(args: ChatHistoryInput) {
  const response = await axiosInstance.get(`/api/chatmessage/${args.chatflowId}`);
  return response.data;
}