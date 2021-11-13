import { SheetbookRequestSpec, SheetType } from "ror-sheetbook-common";
import { generateSheets,  } from "ror-sheetbook-generator/src";
import { DOWNLOAD_PRESERVE_TIME, DOWNLOADS_DIR, SHEETBOOK_DIR } from "../../config";
import { v4 as uuid } from 'uuid';
import mkdirp from 'mkdirp';
import { lockRepository } from "./repository";
import cron from "node-cron";
import { promises as fs } from "fs";
import rimraf from "rimraf";
import util from "util";

export async function createSheet(spec: SheetbookRequestSpec): Promise<string> {
	return await lockRepository(async () => {
		const id = uuid();
		await mkdirp(`${DOWNLOADS_DIR}/${id}`);
		const filename = spec.type === SheetType.SINGLE ? spec.tune : `tunesheet-${spec.format}-${typeof spec.tunes === 'string' ? spec.tunes : 'custom'}`;
		await generateSheets(SHEETBOOK_DIR, [{
			...spec,
			outFile: `${DOWNLOADS_DIR}/${id}/${filename}.pdf`
		}]);
		return `/downloads/${id}/${filename}.pdf`;
	});
}

cron.schedule('0 0 * * * *', async () => {
	for (const file of await fs.readdir(DOWNLOADS_DIR)) {
		const stat = await fs.stat(`${DOWNLOADS_DIR}/${file}`);
		if (Date.now() - stat.birthtimeMs > DOWNLOAD_PRESERVE_TIME * 1000) {
			await util.promisify(rimraf)(`${DOWNLOADS_DIR}/${file}`);
		}
	}
});
