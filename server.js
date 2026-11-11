const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: port });

console.log(`WebSocket server running on port ${port}`);

let players = [];

wss.on('connection', (ws) => {
    if (players.length >= 2) {
        ws.close();
        return;
    }

    players.push(ws);
    const roleId = players.length;
    ws.send(JSON.stringify({ type: 'init', roleId: roleId }));

    ws.on('message', (message) => {
        players.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        players = players.filter(client => client !== ws);
    });
});
