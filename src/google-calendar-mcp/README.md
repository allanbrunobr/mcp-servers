# Google Calendar MCP Server

This is a Model Context Protocol (MCP) server that provides integration with Google Calendar. It allows LLMs to read, create, and manage calendar events through a standardized interface.

## Features

- List available calendars
- List events from a calendar
- Create new calendar events
- Update existing events
- Delete events
- Process events from screenshots and images

## Requirements

1. Node.js 16 or higher
2. TypeScript 5.3 or higher
3. A Google Cloud project with the Calendar API enabled
4. OAuth 2.0 credentials (Client ID and Client Secret)

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pashpashpash/google-calendar-mcp.git
   cd google-calendar-mcp
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Project**:
   ```bash
   npm run build
   ```

## Google Cloud Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
   - Make sure the correct project is selected in the top bar
4. Create OAuth 2.0 credentials:
   - Go to Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as the application type
   - Enter a name for your OAuth client
   - Download the credentials JSON file
   - Rename it to `gcp-oauth.keys.json` and place it in the project root
5. Configure OAuth Consent Screen:
   - Go to "OAuth consent screen"
   - Choose "External" user type
   - Fill in required app information
   - Add required scopes:
     - `https://www.googleapis.com/auth/calendar.events`
   - Add your email as a test user
   - Note: Test user propagation may take a few minutes

## Authentication

Before using the server, you need to authenticate with Google Calendar:

1. Ensure your `gcp-oauth.keys.json` is in the project root directory

2. Start the authentication server:
   ```bash
   npm run auth
   ```

3. Complete the OAuth flow in your browser:
   - You'll see an "unverified app" warning (this is normal for development)
   - Select your Google account
   - Grant the requested calendar permissions

The authentication tokens will be saved in `.gcp-saved-tokens.json` with restricted permissions (600).

## Usage with Claude Desktop

Add this to your claude_desktop_config.json:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["path/to/google-calendar-mcp/build/index.js"]
    }
  }
}
```
Note: Replace "path/to/google-calendar-mcp" with the actual path to your cloned repository.

## Example Usage

The server can handle various calendar management tasks:

1. **Add Events from Screenshots**:
   ```
   Add this event to my calendar based on the attached screenshot.
   ```
   - Supports PNG, JPEG, GIF formats
   - Can extract date, time, location, and description

2. **Check Attendance**:
   ```
   Which events tomorrow have attendees who have not accepted the invitation?
   ```

3. **Auto Coordinate Events**:
   ```
   Here's some availability that was provided to me by someone I am interviewing. Take a look at the available times and create an event for me to interview them that is free on my work calendar.
   ```

4. **Provide Availability**:
   ```
   Please provide availability looking at both my personal and work calendar for this upcoming week. Choose times that work well for normal working hours on the East Coast. Meeting time is 1 hour
   ```

## Development

### Available Scripts
- `npm run build` - Build the TypeScript code
- `npm run build:watch` - Build TypeScript in watch mode
- `npm run dev` - Start the server in development mode
- `npm run auth` - Start the authentication server

### Project Structure
```
google-calendar-mcp/
├── src/           # TypeScript source files
├── build/         # Compiled JavaScript output
├── llm/           # LLM-specific configurations and prompts
├── package.json   # Project dependencies and scripts
└── tsconfig.json  # TypeScript configuration
```

### Debugging

If you run into issues, check Claude Desktop's MCP logs:
```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

Common troubleshooting steps:
1. OAuth Token Errors
   - Verify `gcp-oauth.keys.json` format
   - Delete `.gcp-saved-tokens.json` and re-authenticate
   
2. TypeScript Build Errors
   - Reinstall dependencies: `npm install`
   - Verify Node.js version
   - Clear build directory: `rm -rf build/`

3. Image Processing Issues
   - Check image format compatibility
   - Ensure image text is clear and readable

## Security Notes

- The server runs locally and requires OAuth authentication
- Store OAuth credentials in `gcp-oauth.keys.json`
- Authentication tokens are stored in `.gcp-saved-tokens.json` with restricted permissions
- Tokens auto-refresh when expired
- Never commit credentials or token files
- For production use, get OAuth application verified by Google

## License

MIT

---
Note: This is a fork of the [original google-calendar-mcp repository](https://github.com/nspady/google-calendar-mcp).
