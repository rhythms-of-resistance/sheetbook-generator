import { Server } from "socket.io";
import domain from "domain";
import { Server as HttpServer } from "http";
import { ServerApi, ClientApi, sheetbookRequestSpecValidator } from "ror-sheetbook-common";
import { getTunesInfo } from "./repository";
import { createSheet } from "./downloads";

export function createSocket(server: HttpServer): void {
    const io = new Server<ServerApi, ClientApi>(server, {
        cors: { origin: true }
    });

    io.sockets.on("connection", (socket) => {
        const d = domain.create();
        d.add(socket);
        d.enter();

        d.on("error", function(err) {
            console.error("Uncaught error in socket:", err.stack);
            socket.disconnect();
        });

        socket.on("getTunesInfo", (treeish, callback) => {
            getTunesInfo(treeish).then((tunesInfo) => {
                callback(undefined, tunesInfo);
            }).catch((err) => {
                console.error(err);
                callback(err.stack, undefined as any);
            });
        });

        socket.on("createSheet", (spec, callback) => {
            Promise.resolve()
                .then(() => sheetbookRequestSpecValidator.parse(spec))
                .then((parsedSpec) => createSheet(parsedSpec, (chunk) => {
                    socket.emit("log", chunk.toString('utf8'));
                }))
                .then((downloadPath) => {
                    callback(undefined, downloadPath);
                }).catch((err) => {
                    console.error(err);
                    callback(err.stack, undefined as any);
                });
        })
    });
}