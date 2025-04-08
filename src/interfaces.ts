export interface Msg {
    room_id: number;
    user: string;
    message: string;
    type: number; // 0 = message, 1 = pm, 2 = system
    save: boolean; // should we save this msg to the DB?
}

export interface Room {
    id: number;
    name: string;
    messages: Msg[];
    savedToDB: boolean;
}

export interface SocketData {
    user: string;
}
