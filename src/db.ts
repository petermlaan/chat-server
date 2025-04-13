import { createClient } from '@supabase/supabase-js'
import { Room, Msg } from './interfaces';

const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")

export async function dbGetChatRooms(): Promise<Room[]> {
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
    const chatRooms = data as Room[]
    chatRooms.forEach(r => r.messages = [])
    return chatRooms
}

export async function dbGetMessages(chatRoomId: number, maxCount: number): Promise<Msg[]> {
    const { data, error } = await supabase
        .from("cm_message")
        .select("user, message, room_id")
        .eq("room_id", chatRoomId)
        .order("id", { ascending: false })
        .limit(maxCount)
        .order("id", { ascending: true })
    if (error) {
        console.error("dbGetMessages", error)
        throw error
    }
    if (!data)
        return []
    const msgs = data as Msg[]
    msgs.forEach(m => {
        m.save = false,
        m.type = 0
    })
    return msgs.reverse()
}

export async function dbInsertMessages(msgs: Msg[]) {
    // Filter out messages that should not be saved
    const toSave = msgs.filter(m => m.save)
    if (toSave.length === 0)
        return
    
    // Remove properties not in the db
    const dbMsgs = toSave.map(({ save, type, ...rest }) => rest)
    
    const { error } = await supabase
        .from("cm_message")
        .insert(dbMsgs)
    if (error) {
        console.error("dbInsertMessages", error)
        throw error
    }
    console.log("Msg inserted: " + dbMsgs.length);

    // Mark msg:s as saved
    toSave.forEach(m => m.save = false)
}

