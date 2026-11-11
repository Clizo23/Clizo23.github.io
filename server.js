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

        if (data.type === 'join') {
            if (waitingPlayer && waitingPlayer.readyState === WebSocket.OPEN) {
                const room = { 
                    p1: waitingPlayer, 
                    p2: ws, 
                    currentMap: Math.floor(Math.random() * 3)
                };
                rooms.push(room);

                waitingPlayer.room = room;
                ws.room = room;

                waitingPlayer.send(JSON.stringify({ type: 'assign', role: 1, map: room.currentMap }));
                ws.send(JSON.stringify({ type: 'assign', role: 2, map: room.currentMap }));

                waitingPlayer = null;
            } else {
                waitingPlayer = ws;
                ws.send(JSON.stringify({ type: 'waiting' }));
            }
        } 
        else if (data.type === 'input' || data.type === 'action') {
            if (ws.room) {
                const opponent = ws.room.p1 === ws ? ws.room.p2 : ws.room.p1;
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify(data));
                }
            }
        }
        else if (data.type === 'next_round') {
            if (ws.room) {
                ws.room.currentMap = Math.floor(Math.random() * 3);
                ws.room.p1.send(JSON.stringify({ type: 'new_round', map: ws.room.currentMap }));
                ws.room.p2.send(JSON.stringify({ type: 'new_round', map: ws.room.currentMap }));
            }
        }
        else if (data.type === 'match_over') {
            if (ws.room) {
                const opponent = ws.room.p1 === ws ? ws.room.p2 : ws.room.p1;
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify(data));
                }
            }
        }
    });

    ws.on('close', () => {
        if (waitingPlayer === ws) waitingPlayer = null;
        if (ws.room) {
            const opponent = ws.room.p1 === ws ? ws.room.p2 : ws.room.p1;
            if (opponent && opponent.readyState === WebSocket.OPEN) {
                opponent.send(JSON.stringify({ type: 'opponent_disconnected' }));
            }
            rooms = rooms.filter(r => r !== ws.room);
        }
    });
});
