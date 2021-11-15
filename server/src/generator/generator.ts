import { generateSheets, gitCheckout, gitClone } from "ror-sheetbook-generator/src";
import { SHEETBOOK_DIR, TEMP_DIR, TEMP_OPTIONS } from "../../../config";
import { GenerateRequestMessage } from "../ipc";

(async () => {
	const { id, treeish, spec }: GenerateRequestMessage = JSON.parse(process.argv[2]);

	TEMP_OPTIONS.tmpdir = `${TEMP_DIR}/${id}`;

	await gitClone(SHEETBOOK_DIR, `${TEMP_DIR}/${id}/sheetbook`, { noCheckout: true });
	await gitCheckout(`${TEMP_DIR}/${id}/sheetbook`, treeish);

	await generateSheets(`${TEMP_DIR}/${id}/sheetbook`, [spec]);
})();