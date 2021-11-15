import * as z from "zod";
import { bookletSheetbookSpecValidator, singleSheetbookSpecValidator, TunesInfo } from "./types"

export const sheetbookRequestSpecValidator = z.union([
    singleSheetbookSpecValidator.omit({ outFile: true }),
    bookletSheetbookSpecValidator.omit({ outFile: true })
]).and(z.object({
    treeish: z.string()
}));

export type SheetbookRequestSpec = z.infer<typeof sheetbookRequestSpecValidator>;

export interface ServerApi {
    getTunesInfo: (treeish: string, callback: (err: string | undefined, tunesInfo: TunesInfo) => void) => void;
    createSheet: (spec: SheetbookRequestSpec, callback: (err: string | undefined, downloadPath: string) => void) => void;
    error: (err: any) => void;
}

export interface ClientApi {
    error: (err: any) => void;
    log: (message: string) => void;
}