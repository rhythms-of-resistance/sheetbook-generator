import Vue from "vue";
import Main from "./main/main";
import "./bootstrap.scss";
import { createSocket } from "./socket";
import { showGlobalError } from "./utils";

(async () => {
	const socket = await createSocket("/");

	socket.socket.on("disconnect", (reason) => {
		if (reason === "io server disconnect") {
			showGlobalError(new Error("Server connection crashed."));
		}
	});

	new Vue({
		el: "#loading",
		render: (createElement) => createElement(Main, { props: { socket } }),
	});
})().catch(showGlobalError);