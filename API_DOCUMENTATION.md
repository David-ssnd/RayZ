# RayZ API Documentation

Complete API documentation for the RayZ laser tag game management system.

## 📚 Documentation Files

### [PROTOCOL.md](./PROTOCOL.md)
**WebSocket Protocol v2.3** - Complete specification for real-time communication between web server and ESP32 devices.

**Contents:**
- Connection & authentication
- Message format and operation codes
- All message types (client→ESP32 and ESP32→client)
- Game configuration and commands
- Win condition implementations
- Sequence diagrams
- Error handling
- Best practices

**Use this for:**
- ESP32 firmware development
- WebSocket client implementation
- Understanding game flow
- Debugging communication issues

### [openapi.yaml](./openapi.yaml)
**REST API Specification (OpenAPI 3.0)** - Complete REST API for managing projects, players, teams, and match history.

**Contents:**
- Authentication endpoints
- Project management
- Game mode CRUD operations
- Player and team management
- Device registration
- Match history queries

**Use this for:**
- Frontend API integration
- API client generation
- Server implementation
- Testing and validation

---

## 🚀 Quick Start

### WebSocket Connection

```javascript
// Connect to ESP32 device
const ws = new WebSocket('ws://192.168.1.100:81/ws');

ws.onopen = () => {
  // Request device status
  ws.send(JSON.stringify({
    op: 1,
    type: 'get_status'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### REST API Request

```javascript
// Create a new project
const response = await fetch('/api/v1/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include', // Include session cookie
  body: JSON.stringify({
    name: 'Friday Night Battle',
    description: 'Weekly team deathmatch',
    gameModeId: 'clx1234567890'
  })
});

const project = await response.json();
```

---

## 🎮 Game Flow Examples

### Starting a Game (Time Mode)

```javascript
// 1. Configure devices
await fetch(`/api/v1/projects/${projectId}/devices`, {
  method: 'POST',
  body: JSON.stringify({
    ipAddress: '192.168.1.100',
    name: 'Weapon 1'
  })
});

// 2. Send config via WebSocket
ws.send(JSON.stringify({
  op: 3,
  type: 'config_update',
  device_id: 1,
  player_id: 5,
  team_id: 1,
  win_type: 'time',
  game_duration_s: 600, // 10 minutes
  max_hearts: 5,
  spawn_hearts: 3,
  // ... other config
}));

// 3. Start game
ws.send(JSON.stringify({
  op: 4,
  type: 'game_command',
  command: 1 // START
}));

// 4. Listen for game state updates
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.op === 17) { // GAME_STATE_UPDATE
    console.log('Time remaining:', msg.time_remaining_s);
    console.log('Scores:', msg.current_scores);
  }
  
  if (msg.op === 16) { // GAME_OVER
    console.log('Winner:', msg.winner_player_id);
    console.log('Final scores:', msg.final_scores);
  }
};
```

### Pausing and Resuming

```javascript
// Pause game
ws.send(JSON.stringify({
  op: 4,
  type: 'game_command',
  command: 3 // PAUSE
}));

// Resume after 5 minutes
setTimeout(() => {
  ws.send(JSON.stringify({
    op: 4,
    type: 'game_command',
    command: 4 // UNPAUSE
  }));
}, 5 * 60 * 1000);
```

### Extending Game Time

```javascript
// Add 5 more minutes (time mode only)
ws.send(JSON.stringify({
  op: 4,
  type: 'game_command',
  command: 5, // EXTEND_TIME
  extend_minutes: 5
}));
```

### Updating Target Score

```javascript
// Change target to 150 points (score mode only)
ws.send(JSON.stringify({
  op: 4,
  type: 'game_command',
  command: 6, // UPDATE_TARGET
  new_target: 150
}));
```

---

## 🔑 Authentication

### Session-Based Auth

The API uses HTTP-only cookies for session management.

```javascript
// Login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// Subsequent requests automatically include session cookie
const projects = await fetch('/api/v1/projects', {
  credentials: 'include'
});
```

---

## 📊 Win Condition Modes

### Time Mode
- Game runs for fixed duration
- Player/team with highest score wins
- Can extend time mid-game
- Can pause/resume

**Config:**
```json
{
  "win_type": "time",
  "game_duration_s": 600
}
```

### Score Mode
- First to reach target score wins
- Can update target mid-game
- Can pause/resume

**Config:**
```json
{
  "win_type": "score",
  "target_score": 1000
}
```

### Last Man Standing (LMS)
- Elimination mode
- Hearts = lives
- Players eliminated at 0 hearts
- Last player/team standing wins
- Cannot pause (would be unfair)

**Config:**
```json
{
  "win_type": "last_man_standing",
  "spawn_hearts": 3,
  "max_hearts": 5
}
```

---

## 🛠️ Tools & Integration

### Swagger UI

View interactive API documentation:

**Quick Start:**
```bash
# With pnpm (recommended)
pnpm docs

# With npm
npm run docs

# Direct command
pnpm dlx swagger-ui-serve openapi.json
```

Opens http://localhost:9090 automatically.

**Alternative methods:** See [VIEWING_API_DOCS.md](./VIEWING_API_DOCS.md) for more options.

### Code Generation

Generate API clients from OpenAPI spec:

```bash
# TypeScript client
pnpm dlx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./src/api-client

# Python client
pnpm dlx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./python-client
```

### Postman Collection

Import `openapi.yaml` into Postman:
1. Open Postman
2. Import → Upload Files
3. Select `openapi.yaml`
4. Postman generates full collection with all endpoints

---

## 📈 Match Statistics

### Querying Match History

```javascript
// Get recent matches
const matches = await fetch(
  '/api/v1/matches?projectId=clx123&limit=20&status=completed',
  { credentials: 'include' }
);

// Get specific match details
const match = await fetch(
  '/api/v1/matches/clx456',
  { credentials: 'include' }
);

const data = await match.json();
console.log('Winner:', data.winnerId);
console.log('Duration:', data.endedAt - data.startedAt);
console.log('Players:', data.players);
```

### Player Statistics

Each match includes per-player stats:

```json
{
  "players": [
    {
      "playerId": "clx789",
      "player": { "name": "John Doe" },
      "kills": 15,
      "deaths": 8,
      "hits": 45,
      "shots": 100,
      "score": 1250,
      "finalHearts": 2,
      "eliminated": false
    }
  ]
}
```

---

## 🐛 Debugging

### Enable Debug Logging

**ESP32:**
```c
// Set log level in platformio.ini
build_flags = 
  -DCORE_DEBUG_LEVEL=5  // Verbose
```

**Web Client:**
```javascript
// Log all WebSocket messages
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('[WS IN]', JSON.stringify(msg, null, 2));
};

ws.send = ((original) => {
  return function(data) {
    console.log('[WS OUT]', data);
    return original.apply(this, arguments);
  };
})(ws.send);
```

### Common Issues

**Device not connecting:**
- Check IP address and port (default: 81)
- Verify device is on same network
- Check firewall rules

**Config not applying:**
- Ensure game is stopped before updating config
- Check for validation errors in ACK response
- Verify all required fields are present

**Game not starting:**
- Check that devices are online (send HEARTBEAT)
- Verify game mode configuration
- Check ESP32 serial logs for errors

**Time mode game ending early:**
- Ensure pause/resume properly adjusts end time
- Check for clock drift (ESP32 uptime vs real time)
- Verify game_duration_s is set correctly

---

## 📋 Message Reference

### Quick OpCode Lookup

| OpCode | Direction | Name | Use Case |
|--------|-----------|------|----------|
| 1 | Client→ESP32 | GET_STATUS | Initial connection, sync state |
| 2 | Client→ESP32 | HEARTBEAT | Keep-alive every 10s |
| 3 | Client→ESP32 | CONFIG_UPDATE | Change settings |
| 4 | Client→ESP32 | GAME_COMMAND | Start/stop/pause/extend |
| 10 | ESP32→Client | STATUS | Full device state |
| 11 | ESP32→Client | HEARTBEAT_ACK | Acknowledge heartbeat |
| 12 | ESP32→Client | SHOT_FIRED | Player fired weapon |
| 13 | ESP32→Client | HIT_REPORT | Player was hit |
| 16 | ESP32→Client | GAME_OVER | Game ended, winner declared |
| 17 | ESP32→Client | GAME_STATE_UPDATE | Real-time progress |

---

## 🔐 Security Considerations

### WebSocket Security

- ESP32 WebSocket currently uses **unencrypted HTTP** (ws://)
- For production, implement **TLS/SSL** (wss://)
- Devices on isolated network segment (not public internet)
- Consider adding device authentication tokens

### REST API Security

- Session cookies are HTTP-only (XSS protection)
- Implement CSRF tokens for state-changing requests
- Rate limiting enabled (100 req/min per IP)
- Input validation on all endpoints
- SQL injection protection via Prisma ORM

---

## 🧪 Testing

### Protocol Validation

Test message parsing:

```javascript
const testMessage = {
  op: 3,
  type: 'config_update',
  win_type: 'invalid' // Should fail
};

// Should throw validation error
```

### Integration Tests

```javascript
describe('Game Flow', () => {
  it('should complete time mode game', async () => {
    // 1. Connect devices
    // 2. Send config
    // 3. Start game
    // 4. Wait for duration
    // 5. Verify GAME_OVER received
  });
  
  it('should handle pause/resume correctly', async () => {
    // 1. Start game
    // 2. Pause
    // 3. Wait 5 minutes
    // 4. Resume
    // 5. Verify time adjusted correctly
  });
});
```

---

## 📖 Additional Resources

- **GitHub Repository:** https://github.com/yourusername/rayz
- **Issue Tracker:** https://github.com/yourusername/rayz/issues
- **Discussion Forum:** https://github.com/yourusername/rayz/discussions
- **Wiki:** https://github.com/yourusername/rayz/wiki

---

## 🤝 Contributing

To contribute to the API documentation:

1. Fork the repository
2. Update `PROTOCOL.md` or `openapi.yaml`
3. Test your changes
4. Submit a pull request

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add sequence diagrams for complex flows
- Keep OpenAPI spec in sync with implementation
- Version all breaking changes

---

## 📝 License

This documentation is part of the RayZ project and is available under the MIT License.

---

## 📞 Support

- Email: support@rayz.example.com
- Discord: https://discord.gg/rayz
- Documentation Issues: Tag `documentation` label on GitHub
