# Logging API Documentation

The game provides a real-time logging API for debugging and monitoring NPC behavior, AI interactions, and system events.

## Base URL

```
http://localhost:3003/api/logs
```

## Query Parameters

| Parameter | Description                    | Example Values                              |
| --------- | ------------------------------ | ------------------------------------------- |
| `tag`     | Filter by log tag              | `LLM`, `NPC_BEHAVIOR`, `TOOLS`, `INVENTORY` |
| `entity`  | Filter by entity name          | `Margaret`, `Assistant`, `Player`           |
| `lines`   | Limit number of lines returned | `50`, `100`, `500`                          |

## Available Log Tags

- `LLM` - AI service requests/responses
- `NPC_BEHAVIOR` - NPC decision making and actions
- `TOOLS` - Tool usage and results
- `INVENTORY` - Inventory operations
- `PROXIMITY` - Proximity system events
- `PATHFINDING` - Movement and pathfinding

## Example Requests

### Get all logs

```
GET http://localhost:3003/api/logs
```

### Get LLM-related logs only

```
GET http://localhost:3003/api/logs?tag=LLM
```

### Get logs for specific NPC

```
GET http://localhost:3003/api/logs?entity=Margaret
```

### Get recent AI interactions for Assistant

```
GET http://localhost:3003/api/logs?tag=LLM&entity=Assistant&lines=50
```

### Get tool usage across all NPCs

```
GET http://localhost:3003/api/logs?tag=TOOLS&lines=100
```

## Response Format

Returns JSON array of log entries:

```json
[
  {
    "timestamp": "15:53:49",
    "tag": "LLM",
    "entity": "Grace Sirrine",
    "message": "AI response received",
    "data": { "hasToolCalls": true, "toolCallCount": 1 }
  }
]
```

## Use Cases

- **Debug NPC behavior**: `?entity=Margaret&tag=NPC_BEHAVIOR`
- **Monitor AI performance**: `?tag=LLM&lines=100`
- **Track tool usage**: `?tag=TOOLS`
- **Analyze proximity events**: `?tag=PROXIMITY`
- **Debug pathfinding issues**: `?tag=PATHFINDING`

## Real-time Monitoring

The API returns current log state. For real-time monitoring, poll the endpoint or use browser dev tools to watch console output directly.
