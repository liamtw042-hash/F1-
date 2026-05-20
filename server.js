// F1 Multiplayer Server - Node.js WebSocket
const WebSocket = require('ws');
const http = require('http');
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = new Map();
const clients = new Map();
let nextId = 1;

function generateCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function broadcast(room, data, excludeId) {
    const msg = JSON.stringify(data);
    for (const pid of room.players) {
        if (pid === excludeId) continue;
        const client = clients.get(pid);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(msg);
        }
    }
}

wss.on('connection', (ws) => {
    const playerId = nextId++;
    clients.set(playerId, { ws, roomCode: null, driverName: `Driver${playerId}` });

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        const client = clients.get(playerId);

        switch (msg.type) {
            case 'create_room': {
                const code = generateCode();
                rooms.set(code, {
                    code,
                    host: playerId,
                    players: [playerId],
                    trackKey: msg.trackKey || 'monaco',
                    totalLaps: msg.totalLaps || 5,
                    weather: msg.weather || 'DRY',
                    started: false
                });
                client.roomCode = code;
                ws.send(JSON.stringify({ type: 'room_created', code, playerId }));
                break;
            }
            case 'join_room': {
                const room = rooms.get(msg.code);
                if (!room) { ws.send(JSON.stringify({ type: 'error', text: 'Room not found' })); break; }
                if (room.started) { ws.send(JSON.stringify({ type: 'error', text: 'Race already started' })); break; }
                room.players.push(playerId);
                client.roomCode = msg.code;
                ws.send(JSON.stringify({ type: 'room_joined', code: msg.code, playerId, playerIndex: room.players.length - 1 }));
                broadcast(room, { type: 'player_joined', playerId, driverName: client.driverName }, playerId);
                break;
            }
            case 'start_race': {
                const room = rooms.get(client.roomCode);
                if (!room || room.host !== playerId) break;
                room.started = true;
                broadcast(room, {
                    type: 'race_start',
                    trackKey: room.trackKey,
                    totalLaps: room.totalLaps,
                    weather: room.weather
                });
                break;
            }
            case 'car_state': {
                const room = rooms.get(client.roomCode);
                if (!room) break;
                broadcast(room, { type: 'car_state', playerId, state: msg.state }, playerId);
                break;
            }
            case 'chat': {
                const room = rooms.get(client.roomCode);
                if (!room) break;
                broadcast(room, { type: 'chat', playerId, text: msg.text.substring(0, 100) });
                break;
            }
            case 'ping': {
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
            }
        }
    });

    ws.on('close', () => {
        const client = clients.get(playerId);
        if (client && client.roomCode) {
            const room = rooms.get(client.roomCode);
            if (room) {
                room.players = room.players.filter(id => id !== playerId);
                broadcast(room, { type: 'player_left', playerId });
                if (room.players.length === 0) rooms.delete(client.roomCode);
                else if (room.host === playerId) room.host = room.players[0];
            }
        }
        clients.delete(playerId);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`F1 Multiplayer Server running on ws://localhost:${PORT}`));
