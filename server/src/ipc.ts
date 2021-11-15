import { SheetbookSpec } from "ror-sheetbook-common";

export interface GenerateRequestMessage {
	id: string;
	spec: SheetbookSpec;
	treeish: string;
}