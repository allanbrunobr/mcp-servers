#!/usr/bin/env node
/**
 * Application entry point for the Serper Search MCP server
 */
import './infrastructure/config/environment.js';
import { SerperSearchServer } from './server.js';

// Initialize and run the server
const server = new SerperSearchServer();
server.run().catch(console.error);
