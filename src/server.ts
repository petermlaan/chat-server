import { readFileSync } from "fs"
import { Server } from "socket.io"
import express from "express"
import http from "http"
import { Msg } from "./interfaces"
import { dbGetChatRooms } from "./db"

interface Config {
    rndspeed: number
}

program()

async function program() {
    console.log("Starting websocket server...")

    const buffer = readFileSync("config.json")
    const cfg = JSON.parse(buffer.toString()) as Config
    console.log("rndspeed: " + cfg.rndspeed)

    const app = express()
    const servers: http.Server[] = []
    const rooms = await dbGetChatRooms()
    rooms.forEach(() => servers.push(http.createServer(app)))
    const ios: Server[] = []
    rooms.forEach((_, i) =>
        ios.push(new Server(servers[i], { cors: { origin: "*" } })))

    ios.forEach(io => io.use((socket, next) => {
        const token = socket.handshake.auth.token
        console.log("User token: " + token)
        if (Math.random() > -1) {
            socket.data = token;
            next();
        } else {
            console.log("REJECTED!")
            next(new Error('Invalid token'))
        }
    }))

    ios.forEach(io => io.on('connection', (socket) => {
        console.log('a user connected')
        socket.on('disconnect', () => console.log('user disconnected'))
        socket.on("message", (msg) => {
            const packet: Msg = {
                user: socket.data,
                msg: msg as string,
            }
            console.log("broadcasting: ", packet)
            io.send(JSON.stringify(packet))
        })
    }))

    servers.forEach((server, i) => server.listen(8080 + i, () => {
        console.log("Listening on *:" + (8080 + i))
    }))
}
