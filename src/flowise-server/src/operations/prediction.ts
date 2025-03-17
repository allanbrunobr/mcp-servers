import { axiosInstance } from '../common/utils.js';
import { PredictionInput, PredictionSchema } from '../common/types.js';

export { PredictionSchema };

export async function predict(args: PredictionInput) {
  const response = await axiosInstance.post('/api/prediction', {
    question: args.question,
    ...(args.chatflowId && { chatflowId: args.chatflowId }),
  });
  
  return response.data;
}