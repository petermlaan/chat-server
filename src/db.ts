import { createClient } from '@supabase/supabase-js'

export interface ChatRoom {
    id: number,
    name: string,
}

export async function dbGetChatRooms(): Promise<ChatRoom[]> {
    const supabase = createClient(
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    
        const { data, error } = await supabase
        .from("cmChatRoom")
        .select("id, name")
        .order("id")
    if (error) {
        console.error("dbGetChatRooms", error);
        throw error;
    };
    if (!data)
        return [];
    return data;
}

