# SonarQube MCP Server

An MCP server for interacting with SonarQube's API, allowing you to fetch project metrics, quality gates, issues, and create projects.

## Setup

1. Install the dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

## Configuration

The server requires the following environment variables:

- `SONAR_TOKEN`: Your SonarQube authentication token (required)
- `SONAR_URL`: Your SonarQube server URL (defaults to http://localhost:9000)

### Getting a SonarQube Token

1. Log in to your SonarQube instance
2. Go to User > My Account > Security
3. Generate a new token and save it
4. Add the token to your MCP settings configuration

## Available Tools

### get_project_metrics

Get metrics for a SonarQube project such as coverage, bugs, and code smells.

```json
{
  "projectKey": "my-project",
  "metrics": ["coverage", "bugs", "vulnerabilities"] // optional
}
```

### get_quality_gate

Get quality gate status for a project.

```json
{
  "projectKey": "my-project"
}
```

### get_issues

Get issues (bugs, vulnerabilities, code smells) for a project with optional filters.

```json
{
  "projectKey": "my-project",
  "types": ["BUG", "VULNERABILITY", "CODE_SMELL"], // optional
  "severities": ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"], // optional
  "statuses": ["OPEN", "CONFIRMED", "REOPENED", "RESOLVED", "CLOSED"] // optional
}
```

### create_project

Create a new project in SonarQube.

```json
{
  "name": "My Project",
  "projectKey": "my-project",
  "visibility": "private" // optional, defaults to private
}
```

## Example MCP Settings Configuration

Add this to your MCP settings file:

```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "node",
      "args": ["/path/to/sonarqube-server/dist/index.js"],
      "env": {
        "SONAR_TOKEN": "your-sonarqube-token",
        "SONAR_URL": "http://your-sonarqube-url:9000"
      }
    }
  }
}
