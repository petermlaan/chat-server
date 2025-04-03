import { readFileSync } from "fs"
import { Server } from "socket.io"
import express from "express"
import http from "http"
import { Config, Msg, SocketData } from "./interfaces"
import { dbGetChatRooms, dbGetMessages, dbInsertMessages } from "./db"

program()

async function program() {
    console.log("Starting websocket server...")

    /*     const arr: Msg[] = [
            {chatroom_id: 0, type: 0, user: "Börje", msg: "hej hopp16"},
            {chatroom_id: 0, type: 0, user: "Björne", msg: "hej hopp17"},
            {chatroom_id: 0, type: 0, user: "Bengan", msg: "hej hopp18"},
        ]
        await dbInsertMessages(arr) */

    const buffer = readFileSync("config.json")
    const cfg = JSON.parse(buffer.toString()) as Config
    console.log("rndspeed: " + cfg.rndspeed)

    const app = express()
    const servers: http.Server[] = []
    const rooms = await dbGetChatRooms()
//    const promisearr = rooms.map(r => dbGetMessages(r.id, 10))
//    const messagesarr = await Promise.all(promisearr)
    rooms.forEach((r) => r.messages = [])
//    console.log(rooms) */
    rooms.forEach(() => servers.push(http.createServer(app)))
    const ios: Server[] = []
    rooms.forEach((_, i) =>
        ios.push(new Server(servers[i], { cors: { origin: "*" } })))

    ios.forEach((io, i) => io.use((socket, next) => {
        const socketData: SocketData = { 
            user: socket.handshake.auth.token,
            roomId: i,
        }
        socket.data = socketData;
        next();
    }))

    ios.forEach(io => io.on('connection', (socket) => {
        console.log('a user connected')
        const packet: Msg = {
            chatroom_id: socket.data.roomId,
            type: 1,
            user: socket.data.user,
            msg: "",
        }
        io.send([packet])
        socket.send(rooms[socket.data.roomId].messages)

        socket.on('disconnect', () => {
            console.log('user disconnected')
            const packet: Msg = {
                chatroom_id: socket.data.roomId,
                type: 2,
                user: socket.data.user,
                msg: "",
            }
            io.send([packet])
        })

        socket.on("message", (msg) => {
            const packet: Msg = {
                chatroom_id: socket.data.roomId,
                type: 0,
                user: socket.data.user,
                msg: msg as string,
            }
            const messages = rooms[socket.data.roomId].messages
            messages!.push(packet)
            if (messages!.length > 20)
                messages!.splice(0, messages!.length - 10)
            console.log("broadcasting: ", packet)
            io.send([packet])
        })
    }))

    servers.forEach((server, i) => server.listen(8080 + i, () => {
        console.log("Listening on *:" + (8080 + i))
    }))
}
