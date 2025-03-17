import { authenticate } from '@google-cloud/local-auth';
import * as fs from 'fs/promises';
import * as path from 'path';

// Helper function to get the keys file path
function getKeysFilePath(): string {
  const relativePath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    '../gcp-oauth.keys.json'
  );
  const absolutePath = path.resolve(relativePath);
  console.log("Relative path:", relativePath);
  console.log("Absolute path:", absolutePath);
  return absolutePath;
}

// Helper function to get secure token path
function getSecureTokenPath(): string {
  return path.join(
    path.dirname(new URL(import.meta.url).pathname),
    '../.gcp-saved-tokens.json'
  );
}

async function authenticateAndSaveCredentials(): Promise<void> {
  console.log("Launching auth flow...");
  
  const keyFilePath = getKeysFilePath();
  console.log("Keys file path:", keyFilePath);
  
  // Check if file exists and log its contents
  try {
    const fileContents = await fs.readFile(keyFilePath, 'utf8');
    
    // Verify the JSON structure
    const credentials = JSON.parse(fileContents);
    if (!credentials.installed?.redirect_uris) {
      console.error("Error: Missing 'installed.redirect_uris' in credentials file");
      console.log("Credentials structure:", JSON.stringify(credentials, null, 2));
    }
  } catch (error) {
    console.error("Error reading keys file:", error);
  }
  
  const auth = await authenticate({
    keyfilePath: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  await fs.writeFile(
    getSecureTokenPath(),
    JSON.stringify(auth.credentials, null, 2),
    { mode: 0o600 }
  );
    
  console.log(`Credentials saved to ${getSecureTokenPath()}`);
  process.exit(0);
}

// Main function
async function main() {
  try {
    await authenticateAndSaveCredentials();
  } catch (error) {
    console.error("Authentication failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});