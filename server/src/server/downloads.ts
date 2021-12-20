import { SheetbookRequestSpec, SheetType, TuneSet } from "ror-sheetbook-common";
import { DOWNLOAD_PRESERVE_TIME, DOWNLOADS_DIR, TEMP_DIR, GENERATE_SHEET_TIMEOUT } from "../../../config";
import { v4 as uuid } from 'uuid';
import mkdirp from 'mkdirp';
import cron from "node-cron";
import { promises as fs } from "fs";
import rimraf from "rimraf";
import util from "util";
import { fork } from "child_process";
import { GenerateRequestMessage } from "../ipc";

export async function createSheet({ treeish, ...spec }: SheetbookRequestSpec, log?: (chunk: Buffer) => void): Promise<string> {
	const id = uuid();

	await mkdirp(`${DOWNLOADS_DIR}/${id}`);
	await mkdirp(`${TEMP_DIR}/${id}`);

	try {
		const filename = (
			spec.type === SheetType.SINGLE ? spec.tune :
			spec.tunes === TuneSet.CA_BOOKLET ? `${spec.tunes}-${spec.format}` :
			`tunesheet-${spec.format}-${typeof spec.tunes === 'string' ? spec.tunes : 'custom'}`
		);
		const req: GenerateRequestMessage = {
			id,
			spec: {
				...spec,
				outFile: `${DOWNLOADS_DIR}/${id}/${filename}.pdf`
			},
			treeish
		};

		const n = fork(`${__dirname}/../generator/generator`, [JSON.stringify(req)], {
			stdio: 'pipe',
			env: {
				...process.env,
				TERM: 'xterm-256color',
				FORCE_COLOR: '2'
			},
			timeout: GENERATE_SHEET_TIMEOUT * 1000
		});

		return await new Promise<string>((resolve, reject) => {
			n.on('error', reject);
			n.on('exit', (code, signal) => {
				if (signal) {
					reject(new Error(`generator was terminated by signal ${signal}`));
				} else if (code !== 0) {
					reject(new Error(`generator exited with code ${code}`));
				} else {
					resolve(`/downloads/${id}/${filename}.pdf`);
				}
			});
			if (log) {
				n.stdout?.on('data', log);
				n.stderr?.on('data', log);
			}
		});
	} finally {
		await util.promisify(rimraf)(`${TEMP_DIR}/${id}`);
	}
}

cron.schedule('0 0 * * * *', async () => {
	for (const file of await fs.readdir(DOWNLOADS_DIR)) {
		const stat = await fs.stat(`${DOWNLOADS_DIR}/${file}`);
		if (Date.now() - stat.birthtimeMs > DOWNLOAD_PRESERVE_TIME * 1000) {
			await util.promisify(rimraf)(`${DOWNLOADS_DIR}/${file}`);
		}
	}
});
