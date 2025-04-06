export interface Msg {
    room_id: number;
    user: string;
    message: string;
    save: boolean; // should we save this msg to the DB?
}

export interface ChatRoom {
    id: number;
    name: string;
    messages: Msg[];
}

export interface SocketData {
    user: string;
}
