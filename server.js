const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: port });

console.log(`WebSocket server running on port ${port}`);

let waitingPlayer = null;
let rooms = [];

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        // Matchmaking logic
        if (data.type === 'join') {
            if (waitingPlayer && waitingPlayer.readyState === WebSocket.OPEN) {
                // Create a room with 2 players
                const room = { p1: waitingPlayer, p2: ws };
                rooms.push(room);

                waitingPlayer.room = room;
                ws.room = room;

                waitingPlayer.send(JSON.stringify({ type: 'assign', role: 1 }));
                ws.send(JSON.stringify({ type: 'assign', role: 2 }));

                waitingPlayer = null;
            } else {
                waitingPlayer = ws;
                ws.send(JSON.stringify({ type: 'waiting' }));
            }
        } 
        // Gameplay synchronization
        else if (data.type === 'input' || data.type === 'action') {
            if (ws.room) {
                const opponent = ws.room.p1 === ws ? ws.room.p2 : ws.room.p1;
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify(data));
                }
            }
        }
    });

    ws.on('close', () => {
        if (waitingPlayer === ws) {
            waitingPlayer = null;
        }
        if (ws.room) {
            const opponent = ws.room.p1 === ws ? ws.room.p2 : ws.room.p1;
            if (opponent && opponent.readyState === WebSocket.OPEN) {
                opponent.send(JSON.stringify({ type: 'opponent_disconnected' }));
            }
            rooms = rooms.filter(r => r !== ws.room);
        }
    });
});
