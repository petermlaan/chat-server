import * as fs from "fs"
import { Server } from "socket.io"
import express from "express"
import http from "http"

interface IConfig {
    rndspeed: number
}

console.log("Starting websocket server...")

const buffer = fs.readFileSync("config.json")
const cfg = JSON.parse(buffer.toString()) as IConfig
console.log("rndspeed: " + cfg.rndspeed)

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
    }
})

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log("User token: " + token)
    if (Math.random() > 0.2) {
        console.log("Valid!")
        socket.data = token;
        next();
    } else {
        console.log("REJECTED!")
        next(new Error('Invalid token'));
    }
})

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => console.log('user disconnected'))
    socket.on("message", (msg) => {
        console.log("received message: ", msg)
        io.send(socket.data + ": " + msg)
    })
})

server.listen(8080, () => {
    console.log('Listening on *:8080')
})
