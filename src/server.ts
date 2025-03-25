import * as fs from "fs"
import { Server } from "socket.io"
import express from "express"
import http from "http"

interface IConfig {
    rndspeed: number
}

console.log("starting websocket server...")

const cfg = fs.readFileSync("config.json")
const cfgo = JSON.parse(cfg.toString()) as IConfig
console.log("rndspeed: " + cfgo.rndspeed)

const app = express()
const server = http.createServer(app)
const io = new Server(server, {cors: {
    origin: "http://localhost:3000",
}})

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(8080, () => {
    console.log('listening on *:8080');
});

io.on("message", (args) => {
    console.log("received message", args)
    io.send("hello from the server")
})

/*const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');

    ws.on('message', (message: string) => {
        console.log(`Received message: ${message}`);
        ws.send(`Server received your message: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});*/