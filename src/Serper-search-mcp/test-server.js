#!/usr/bin/env node

import { spawn } from "child_process";
import { createInterface } from "readline";

// Path to the server executable
const serverPath =
  "/Users/bruno/Documents/Cline/MCP/Serper-search-mcp/build/index.js";

// Environment variables
const env = {
  ...process.env,
  SERPER_API_KEY: "1fb34e94ce6de29c35fc692bfed57a8b69629298",
};

// Start the server process
console.log("Starting Serper search MCP server...");
const serverProcess = spawn("node", [serverPath], {
  env,
  stdio: ["pipe", "pipe", "pipe"],
});

// Create readline interface for server stdout
const rl = createInterface({
  input: serverProcess.stdout,
  crlfDelay: Infinity,
});

// Handle server output
rl.on("line", (line) => {
  console.log(`Server: ${line}`);
});

// Handle server errors
serverProcess.stderr.on("data", (data) => {
  console.error(`Server error: ${data}`);
});

// Send a test search request
setTimeout(() => {
  console.log("Sending test search request...");

  const searchRequest = {
    jsonrpc: "2.0",
    id: "1",
    method: "call_tool",
    params: {
      name: "serper-google-search",
      arguments: {
        query: "latest AI developments 2025",
        numResults: 3,
        gl: "us",
        hl: "en",
      },
    },
  };

  serverProcess.stdin.write(JSON.stringify(searchRequest) + "\n");
}, 2000);

// Clean up on exit
process.on("SIGINT", () => {
  console.log("Shutting down...");
  serverProcess.kill();
  process.exit();
});
