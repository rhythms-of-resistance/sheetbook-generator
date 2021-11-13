import { SheetbookRequestSpec, SheetType } from "ror-sheetbook-common";
import { generateSheets,  } from "ror-sheetbook-generator/src";
import { DOWNLOADS_DIR, SHEETBOOK_DIR } from "../../config";
import { v4 as uuid } from 'uuid';
import mkdirp from 'mkdirp';
import { lockRepository } from "./repository";

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