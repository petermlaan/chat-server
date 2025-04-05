import { Server } from "socket.io"
import express from "express"
import http from "http"
import { Msg, SocketData } from "./interfaces"
import { dbGetChatRooms, dbGetMessages, dbInsertMessages } from "./db"

const msgBuffSize = 50

program()

async function program() {
    console.log("Starting websocket server...")

    const rooms = await dbGetChatRooms()
    const promisearr = rooms.map(r => dbGetMessages(r.id, msgBuffSize))
    const messagesarr = await Promise.all(promisearr)
    rooms.forEach((r, i) => r.messages = messagesarr[i])

    const app = express()
    const server = http.createServer(app)
    const io = new Server(server, { cors: { origin: "*" } })
    io.use((socket, next) => {
        console.log("io.use")
        const socketData: SocketData = { user: socket.handshake.auth.token }
        socket.data = socketData;
        next();
    })
    io.on('connection', socket => {
        console.log('a user connected')
        socket.on('disconnect', () => {
            console.log('user disconnected')
        })
        socket.on("message", (data) => {
            console.log("message: ", data)
            const msgin = data as Msg
            msgin.save = true
            io.to("" + msgin.chatroom_id).emit("message", [msgin])
            const messages = rooms[socket.data.roomId].messages
            messages.push(msgin)
            if (messages.length > 2 * msgBuffSize) {
                const pruned = messages.splice(0, messages!.length - msgBuffSize)
                console.log(pruned.length + " messages pruned")
                dbInsertMessages(pruned)
            }
        })
        socket.on("join", (data) => {
            console.log("join: ", data)
            const msg = data as Msg
            socket.join("" + msg.chatroom_id)
            socket.send(rooms[socket.data.roomId].messages)
            const packet: Msg = {
                chatroom_id: msg.chatroom_id,
                type: 3,
                user: socket.data.user,
                msg: "",
                save: true,
            }
            io.to("" + msg.chatroom_id).emit("joined", packet)
        })
    })

    server.listen(8080, () => {
        console.log("Listening on *:" + 8080)
    })
}
