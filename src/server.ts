import { Server } from "socket.io"
import express from "express"
import http from "http"
import { Room, Msg, SocketData } from "./interfaces"
import { dbGetChatRooms, dbGetMessages, dbInsertMessages } from "./db"

const msgBuffSize = 50
const saveToDBInterval = 120 // in seconds

program()

async function program() {
    console.log("Starting websocket server...")

    // set up chat rooms and load messages from db
    const rooms = await dbGetChatRooms()
    const promisearr = rooms.map(r => dbGetMessages(r.id, msgBuffSize))
    const messagesarr = await Promise.all(promisearr)
    rooms.forEach((r, i) => r.messages = messagesarr[i])

    // Set up save to db interval
    setInterval(() => rooms.forEach(r => 
        onSaveMessages(r)), saveToDBInterval * 1000)

    // Create the websocket
    const app = express()
    const server = http.createServer(app)
    const io = new Server(server, { cors: { origin: "*" } })
    io.use((socket, next) => {
        console.log("io.use")
        const socketData: SocketData = { user: socket.handshake.auth.token }
        socket.data = socketData
        next()
    })
    io.on('connection', socket => {
        console.log('a user connected')
        socket.on('disconnect', () => {
            console.log('user disconnected')
        })
        socket.on("message", (data) => {
            const msg = data as Msg
            msg.save = true
            io.to("" + msg.room_id).emit("message", [msg])
            const room = rooms[msg.room_id]
            const messages = room.messages
            messages.push(msg)
            if (messages.length > 2 * msgBuffSize) {
                dbInsertMessages(messages)
                room.savedToDB = true
                const pruned = messages.splice(0, messages!.length - msgBuffSize)
                console.log("Messages pruned: " + pruned.length)
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
                save: false,
            }
            io.to("" + msg.room_id).emit("joined", packet)
        })
        socket.on("leave", (data) => {
            console.log("leave: ", data)
            const msg = data as Msg
            socket.leave("" + msg.room_id)
            const packet: Msg = {
                room_id: msg.room_id,
                user: socket.data.user,
                message: "",
                save: false,
            }
            io.to("" + msg.room_id).emit("left", packet)
        })
    })

    // Start listening
    server.listen(8080, () => {
        console.log("Listening on *:" + 8080)
    })
}

function onSaveMessages(room: Room) {
    console.log("onSaveMessages")
    if (room.savedToDB) {
        room.savedToDB = false
        return
    }
    console.log("onSaveMessages saving...")
    dbInsertMessages(room.messages)
}