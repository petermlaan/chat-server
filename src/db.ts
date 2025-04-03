import { createClient } from '@supabase/supabase-js'
import { ChatRoom, Msg } from './interfaces';

export async function dbGetChatRooms(): Promise<ChatRoom[]> {
    const supabase = createClient(
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")

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
    return data
}

export async function dbGetMessages(chatRoomId: number, maxCount: number): Promise<Msg[]> {
    const supabase = createClient(
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")

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
    return data;
}

export async function dbInsertMessages(messages: Msg[]) {
    const supabase = createClient(
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")

    const { error } = await supabase
        .from('cmMessage')
        .insert(messages)
    if (error) {
        console.error("dbGetMessages", error)
        throw error
    }
}

