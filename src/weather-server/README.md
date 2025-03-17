# Weather MCP Server

## Overview

This is a Model Context Protocol (MCP) server that provides weather data functionality. It connects to the OpenWeather API to fetch current weather conditions and forecasts for cities around the world.

## Features

- Get current weather conditions for any city
- Get multi-day weather forecasts
- Access weather data through both MCP resources and tools

## Prerequisites

- Node.js (v16 or higher)
- OpenWeather API key

## Installation

```bash
# Navigate to the weather server directory
cd src/weather-server

# Install dependencies
npm install

# Build the server
npm run build
```

## Configuration

You need to set the `OPENWEATHER_API_KEY` environment variable with your OpenWeather API key. You can get a free API key by signing up at [OpenWeather](https://openweathermap.org/api).

## Usage

### Running the Server

```bash
# Start the server
npm start
```

### MCP Integration

To use this server with an MCP-compatible client, add it to your MCP configuration:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/weather-server/dist/index.js"],
      "env": {
        "OPENWEATHER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### get_forecast

Get a weather forecast for a specified city.

**Parameters:**
- `city` (string, required): The name of the city
- `days` (number, optional): Number of days for the forecast (1-5, default: 3)

**Example:**
```json
{
  "city": "London",
  "days": 5
}
```

## Available Resources

### Current Weather

**URI Template:** `weather://{city}/current`

Provides current weather data for the specified city.

**Example URI:** `weather://Tokyo/current`

## License

MIT
