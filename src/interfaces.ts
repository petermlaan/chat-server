export interface Msg {
    type: number; // 0 - message, 1 - user joined, 2  - user left
    user: string;
    msg: string;
}

export interface Config {
    rndspeed: number
}
