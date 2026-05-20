// Multiplayer client via WebSocket
class MultiplayerClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.roomCode = null;
        this.playerId = null;
        this.remoteCars = {};
        this.onStateUpdate = null;
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onRaceStart = null;
        this.onMessage = null;
        this.pingInterval = null;
        this.latency = 0;
        this._pingTime = 0;
    }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);
                this.ws.onopen = () => {
                    this.connected = true;
                    this._startPing();
                    resolve();
                };
                this.ws.onerror = (e) => reject(e);
                this.ws.onclose = () => {
                    this.connected = false;
                    clearInterval(this.pingInterval);
                    if (this.onMessage) this.onMessage('Disconnected from server', 'warning');
                };
                this.ws.onmessage = (e) => this._handleMessage(JSON.parse(e.data));
            } catch (err) {
                reject(err);
            }
        });
    }

    createRoom(trackKey, totalLaps, weather) {
        this._send({ type: 'create_room', trackKey, totalLaps, weather });
    }

    joinRoom(code) {
        this._send({ type: 'join_room', code });
    }

    sendCarState(car) {
        if (!this.connected) return;
        this._send({ type: 'car_state', state: car.serialize() });
    }

    sendLapComplete(lap, lapTime) {
        this._send({ type: 'lap_complete', lap, lapTime });
    }

    sendPitStop() {
        this._send({ type: 'pit_stop' });
    }

    sendChat(text) {
        this._send({ type: 'chat', text });
    }

    _send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    _startPing() {
        this.pingInterval = setInterval(() => {
            this._pingTime = Date.now();
            this._send({ type: 'ping' });
        }, 2000);
    }

    _handleMessage(msg) {
        switch (msg.type) {
            case 'room_created':
                this.roomCode = msg.code;
                this.playerId = msg.playerId;
                if (this.onMessage) this.onMessage(`Room created: ${msg.code}`, 'info');
                break;
            case 'room_joined':
                this.roomCode = msg.code;
                this.playerId = msg.playerId;
                if (this.onMessage) this.onMessage(`Joined room: ${msg.code}`, 'info');
                break;
            case 'player_joined':
                if (this.onPlayerJoin) this.onPlayerJoin(msg.playerId, msg.driverName);
                if (this.onMessage) this.onMessage(`${msg.driverName} joined!`, 'info');
                break;
            case 'player_left':
                delete this.remoteCars[msg.playerId];
                if (this.onPlayerLeave) this.onPlayerLeave(msg.playerId);
                break;
            case 'race_start':
                if (this.onRaceStart) this.onRaceStart(msg);
                break;
            case 'car_state':
                this.remoteCars[msg.playerId] = msg.state;
                if (this.onStateUpdate) this.onStateUpdate(msg.playerId, msg.state);
                break;
            case 'pong':
                this.latency = Date.now() - this._pingTime;
                break;
            case 'error':
                if (this.onMessage) this.onMessage(msg.text, 'error');
                break;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        clearInterval(this.pingInterval);
    }

    getLatency() { return this.latency; }
    isConnected() { return this.connected; }
}
