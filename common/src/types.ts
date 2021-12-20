import * as z from 'zod';

export interface TunesInfo {
    existingTunes: Array<{ name: string; displayName: string }>;
    tuneSets: Record<string, string[]>;
}

export enum SheetType {
    /** Generate a single-tune PDF sheet for one tune at the specified file path. */
    SINGLE = 'single',
    /** Generate multiple single-tune PDF, for a predefined tune set or a custom list of tunes, in the specified directory. */
    MULTIPLE = 'multiple',
    /** Generate an A4, A5 or A6 booklet for a predefined tune set or a custom list of tunes, at the specified file path. */
    BOOKLET = 'booklet'
}

export const sheetTypeValidator = z.nativeEnum(SheetType);

export enum SheetFormat {
    A4 = 'a4',
    A5 = 'a5',
    A6 = 'a6'
}

export const sheetFormatValidator = z.nativeEnum(SheetFormat);

export const singleSheetbookSpecValidator = z.object({
    type: z.literal(SheetType.SINGLE),
    tune: z.string(),
    outFile: z.string()
});

export type SingleSheetbookSpec = z.infer<typeof singleSheetbookSpecValidator>;

export const multipleSheetbookSpecValidator = z.object({
    type: z.literal(SheetType.MULTIPLE),
    tunes: z.string().or(z.array(z.string())),
    outDir: z.string()
});

export type multipleSheetbookSpec = z.infer<typeof multipleSheetbookSpecValidator>;

export const bookletSheetbookSpecValidator = z.object({
    type: z.literal(SheetType.BOOKLET),
    tunes: z.string().or(z.array(z.string())),
    format: sheetFormatValidator,
    outFile: z.string()
});

export type BookletSheetbookSpec = z.infer<typeof bookletSheetbookSpecValidator>;

export const sheetbookSpecValidator = z.union([
    singleSheetbookSpecValidator,
    multipleSheetbookSpecValidator,
    bookletSheetbookSpecValidator
]);

export type SheetbookSpec = z.infer<typeof sheetbookSpecValidator>;

// https://stackoverflow.com/a/57103940/242365
export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;