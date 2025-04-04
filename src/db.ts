import { createClient } from '@supabase/supabase-js'
import { ChatRoom, Msg } from './interfaces';

const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")

export async function dbGetChatRooms(): Promise<ChatRoom[]> {
    const { data, error } = await supabase
        .from("cmChatRoom")
        .select("id, name")
        .order("id")
    if (error) {
        console.error("dbGetChatRooms", error)
        throw error
    }
    if (!data)
        return []
    const chatRooms = data as ChatRoom[]
    chatRooms.forEach(r => r.messages = [])
    return chatRooms
}

export async function dbGetMessages(chatRoomId: number, maxCount: number): Promise<Msg[]> {
    const { data, error } = await supabase
        .from("cmMessage")
        .select("type, user, msg, chatroom_id")
        .eq("chatroom_id", chatRoomId)
        .order("id", { ascending: false })
        .limit(maxCount)
        .order("id", { ascending: true })
    if (error) {
        console.error("dbGetMessages", error)
        throw error
    }
    if (!data)
        return []
    const messages = data as Msg[]
    messages.forEach(m => m.save = false)
    return messages
}

export async function dbInsertMessages(messages: Msg[]) {
    // Filter out messages that should not be saved
    const toSave = messages.filter(m => m.save === true)

    // Remove unwanted properties
    const dbmessages = toSave.map(({ save, ...rest }) => rest)

    const { error } = await supabase
        .from("cmMessage")
        .insert(dbmessages)
    if (error) {
        console.error("dbInsertMessages", error)
        throw error
    }
}

