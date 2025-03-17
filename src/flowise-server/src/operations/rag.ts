import { queryRAG } from '../common/rag';

export async function handleQueryRAG(question: string) {
    const results = await queryRAG(question);
    return {
        content: {
            results: results.map(doc => ({
                content: doc.pageContent,
                metadata: doc.metadata
            }))
        }
    };
} 