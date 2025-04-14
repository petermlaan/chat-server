import { Server } from "socket.io"
import express from "express"
import http from "http"
import { Room, Msg, SocketData } from "./interfaces"
import { dbGetChatRooms, dbGetMessages, dbInsertMessages } from "./db"

const msgBuffSize = 50
const saveToDBInterval = 120 // in seconds

program()

async function program() {
    function getRoom(roomId: number) {
        return rooms.find(r => r.id === roomId)
    }

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
        socket.on('disconnecting', () => {
            console.log('user disconnecting...')
            socket.rooms.forEach(r => {
                // Don't send left msg to the user room
                if (rooms.find(room => "" + room.id === r)) {
                    const packet: Msg = {
                        room_id: +r,
                        user: socket.data.user,
                        type: 2,
                        message: "",
                        save: false,
                    }
                    io.to(r).emit("left", packet)
                }
            })
        })
        socket.on("message", (data) => {
            const msg = data as Msg
            msg.save = true
            msg.type = 0
            io.to("" + msg.room_id).emit("message", [msg])
            const room = getRoom(msg.room_id)
            if (!room) {
                console.log("Found no room for msg: ", msg)
                return
            }
            const messages = room.messages
            messages.push(msg)
            if (messages.length > 2 * msgBuffSize) {
                dbInsertMessages(messages)
                room.savedToDB = true
                messages.splice(0, messages!.length - msgBuffSize)
            }
        })
        socket.on("pm", (data) => {
            const msg = data as Msg
            const toUser = msg.message.substring(1, (msg.message.indexOf(" ")))
            if (!toUser)
                return
            for (const [_, s] of io.of("/").sockets) {
                if (s.data.user === toUser) {
                    s.emit("pm", [msg])
                    break
                }
            }
        })
        socket.on("join", (data) => {
            console.log("join: ", data)
            const msg = data as Msg
            socket.join("" + msg.room_id)
            const room = getRoom(msg.room_id)
            if (!room) {
                console.log("Found no room for msg: ", msg)
                return
            }
            socket.send(room.messages)
            const packet: Msg = {
                room_id: msg.room_id,
                user: socket.data.user,
                type: 2,
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
                type: 2,
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
    if (room.savedToDB) {
        // Don't save messages if the overflow check 
        // saved them since the last timer tick
        room.savedToDB = false
        return
    }
    dbInsertMessages(room.messages)
}

