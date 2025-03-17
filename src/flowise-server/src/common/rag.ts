import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Chroma } from '@langchain/community/vectorstores/chroma';

const REPO_PATH = process.env.FLOWISE_REPO_PATH || '/Users/bruno/WebstormProjects/Flowise';

let vectorStore: Chroma | null = null;

export async function initializeRAG() {
    if (vectorStore) return vectorStore;

    const loader = new DirectoryLoader(REPO_PATH, {
        '.ts': (path) => new TextLoader(path),
        '.js': (path) => new TextLoader(path),
        '.json': (path) => new TextLoader(path),
        '.md': (path) => new TextLoader(path)
    });

    const docs = await loader.load();
    
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    
    const splits = await textSplitter.splitDocuments(docs);
    const embeddings = new OpenAIEmbeddings();
    
    vectorStore = await Chroma.fromDocuments(splits, embeddings, {
        collectionName: 'flowise-repo'
    });

    return vectorStore;
}

export async function queryRAG(question: string) {
    const store = await initializeRAG();
    const results = await store.similaritySearch(question, 3);
    return results;
}