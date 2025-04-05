export interface Msg {
    chatroom_id: number;
    type: number; // 0 - message, 1 - user joined, 2  - user left
    user: string;
    msg: string;
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
