import Vue from "vue";
import Component from "vue-class-component";
import WithRender from "./settings-form.vue";
import { Prop, Ref, Watch } from "vue-property-decorator";
import "./settings-form.scss";
import { SheetbookRequestSpec, SheetFormat, SheetType, TuneSet } from "ror-sheetbook-common";
import { Socket } from "../socket";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import 'xterm/css/xterm.css';
import { saveAs } from 'file-saver';

@WithRender
@Component({
	components: { }
})
export default class SettingsForm extends Vue {

	@Prop({ type: Socket, required: true }) socket!: Socket;

	@Ref() terminalRef!: HTMLDivElement;

	terminal!: Terminal;
	fitAddon!: FitAddon;

	format: 'booklet-a4' | 'booklet-a5' | 'booklet-a6' | 'single' = 'booklet-a4';
	tuneset: 'no-ca' | 'all' | 'custom' = 'no-ca';
	tunes: string[] = [];
	tune: string = 'breaks';

	isSubmitting = false;
	showLog = false;

	mounted(): void {
		this.terminal = new Terminal();
		this.fitAddon = new FitAddon();
		this.terminal.loadAddon(this.fitAddon);
		this.terminal.loadAddon(new WebLinksAddon());
		this.terminal.open(this.terminalRef);
		this.fitAddon.fit();
		this.socket.socket.on("log", this.handleLog);
		window.addEventListener("resize", this.handleResize);
	}

	beforeDestroy(): void {
		this.socket.socket.off("log", this.handleLog);
		window.removeEventListener("resize", this.handleResize);
	}

	handleLog(message: string): void {
		this.terminal.write(message.replace(/\n/g, '\r\n'));
	}

	handleResize(): void {
		this.fitAddon.fit();
	}

	@Watch('tuneset', { immediate: true })
	handleTunesetChange(): void {
		if (this.tuneset !== 'custom') {
			this.tunes = [...this.socket.tunesInfo.tuneSets[this.tuneset]];
		}
	}

	selectAll(): void {
		this.tunes = this.socket.tunesInfo.existingTunes.map((t) => t.name);
	}

	async submit(): Promise<void> {
		if (this.isSubmitting) {
			return;
		}

		this.terminal.reset();
		this.isSubmitting = true;
		this.showLog = true;

		try {
			const spec: SheetbookRequestSpec = this.format === 'single' ? {
				type: SheetType.SINGLE,
				tune: this.tune
			} : {
				type: SheetType.BOOKLET,
				format: this.format === 'booklet-a6' ? SheetFormat.A6 : this.format === 'booklet-a5' ? SheetFormat.A5 : SheetFormat.A4,
				tunes: this.tuneset === 'no-ca' ? TuneSet.NO_CA : this.tuneset === 'all' ? TuneSet.ALL : this.tunes
			};

			const downloadPath = await this.socket.createSheet(spec);
			const downloadUrl = new URL(downloadPath, location.href);
			this.terminal.writeln('');
			this.terminal.writeln(`\x1B[1;32mSheet generation sucessful: ${new URL(downloadPath, location.href)}`);
			saveAs(downloadPath, downloadUrl.pathname.split('/').pop());
		} catch (err: any) {
			this.terminal.writeln('');
			this.terminal.writeln(`\x1B[1;31mSheet generation failed.`);
			this.terminal.writeln(err.message.replace(/\n/g, '\r\n'));
		} finally {
			this.isSubmitting = false;
		}
	}

}