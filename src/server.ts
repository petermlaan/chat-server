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
            const msg = data as Msg
            msg.save = true
            io.to("" + msg.room_id).emit("message", [msg])
            const messages = rooms[msg.room_id].messages
            messages.push(msg)
            if (messages.length > 2 * msgBuffSize) {
                const pruned = messages.splice(0, messages!.length - msgBuffSize)
                console.log(pruned.length + " messages pruned")
                dbInsertMessages(pruned)
            }
        })
        socket.on("join", (data) => {
            console.log("join: ", data)
            const msg = data as Msg
            socket.join("" + msg.room_id)
            socket.send(rooms[msg.room_id].messages)
            const packet: Msg = {
                room_id: msg.room_id,
                user: socket.data.user,
                message: "",
                save: true,
            }
            io.to("" + msg.room_id).emit("joined", packet)
        })
    })

    server.listen(8080, () => {
        console.log("Listening on *:" + 8080)
    })
}
