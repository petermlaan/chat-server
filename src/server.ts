import { Server } from "socket.io"
import express from "express"
import http from "http"
import { Msg, SocketData } from "./interfaces"
import { dbGetChatRooms, dbGetMessages, dbInsertMessages } from "./db"

const msgBuffSize = 50

program()

async function program() {
    console.log("Starting websocket server...")

    const app = express()
    const servers: http.Server[] = []
    const ios: Server[] = []
    const rooms = await dbGetChatRooms()
    const promisearr = rooms.map(r => dbGetMessages(r.id, msgBuffSize))
    const messagesarr = await Promise.all(promisearr)
    rooms.forEach((r, i) => r.messages = messagesarr[i])
    rooms.forEach(() => servers.push(http.createServer(app)))
    rooms.forEach((_, i) => ios.push(new Server(servers[i], { cors: { origin: "*" } })))

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
            save: false,
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
                save: false,
            }
            io.send([packet])
        })

        socket.on("message", (msg) => {
            const packet: Msg = {
                chatroom_id: socket.data.roomId,
                type: 0,
                user: socket.data.user,
                msg: msg as string,
                save: true,
            }
            const messages = rooms[socket.data.roomId].messages
            messages.push(packet)
            if (messages.length > 2 * msgBuffSize) {
                const pruned = messages.splice(0, messages!.length - msgBuffSize)
                console.log(pruned.length + " messages pruned")
                dbInsertMessages(pruned)
            }
            io.send([packet])
        })
    }))

    servers.forEach((server, i) => server.listen(8080 + i, () => {
        console.log("Listening on *:" + (8080 + i))
    }))
}
