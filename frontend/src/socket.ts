import { io, Socket as SocketIO } from "socket.io-client";
import { ClientApi, ServerApi, SheetbookRequestSpec, TunesInfo } from "ror-sheetbook-common";

export async function createSocket(server: string): Promise<Socket> {
    const result = new Socket(server);
    await result.init();
    return result;
}

export class Socket {

    socket: SocketIO<ClientApi, ServerApi>;
    tunesInfo!: TunesInfo;

    constructor(server: string) {
        const serverUrl = typeof location != "undefined" ? new URL(server, location.href) : new URL(server);

        this.socket = io(serverUrl.origin, {
            forceNew: true,
            path: serverUrl.pathname.replace(/\/$/, "") + "/socket.io"
        }) as SocketIO<ClientApi, ServerApi>;
    }

    async init(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this.socket.once("connect", resolve);
            this.socket.once("error", reject);
        });

        this.tunesInfo = await new Promise<TunesInfo>((resolve, reject) => {
            this.socket.emit("getTunesInfo", (err, tunesInfo) => {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve(tunesInfo);
                }
            });
        });;
    }

    async createSheet(spec: SheetbookRequestSpec): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            this.socket.emit("createSheet", spec, (err, downloadPath) => {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve(downloadPath);
                }
            });
        });
    }

}