import { dir, DirectoryResult, file, FileResult } from "tmp-promise";
import { globby } from "zx";
import { concatPdfs, convertOdToPdf, convertSvgToPdf, getNumberOfPages, pdfToPortrait, scalePdfToA4, scalePdfToA5Booklet, scalePdfToA6Booklet } from "./convert";
import { promises as fs } from "fs";
import dayjs from "dayjs";
import { getCommitId } from "./git";
import { CA_TUNES, TEMP_OPTIONS } from "../../config";
import { SheetbookSpec, SheetFormat, SheetType, TuneSet } from "ror-sheetbook-common";

/**
 * Generate the sheets with the given specifications. Since this method creates temporary files that it cleans up again afterwards,
 * it is faster to call this method once with all desired specifications, rather than multiple times with each specification, so
 * that the temporary files can be reused for the different generations.
 * @param inDir The directory to the local working copy of the sheetbook repository (https://github.com/rhythms-of-resistance/sheetbook)
 * @param specs A list of sheetbook specifications
 */
export async function generateSheets(inDir: string, specs: SheetbookSpec[]): Promise<void> {
    const needsExistingTunes = specs.some((spec) => (spec.type === SheetType.BOOKLET || spec.type === SheetType.MULTIPLE) && typeof spec.tunes === 'string');
    const existingTunes = needsExistingTunes ? await getExistingTunes(inDir) : [];
    const commitId = specs.some((spec) => spec.type === SheetType.BOOKLET) ? await getCommitId(inDir) : undefined;

    const singleTunes = specs.flatMap((spec) => spec.type === SheetType.SINGLE ? [spec.tune] : spec.type === SheetType.MULTIPLE ? [...resolveTuneSet(spec.tunes, existingTunes)] : []);
    const bookletTunes = specs.flatMap((spec) => spec.type === SheetType.BOOKLET ? [...resolveTuneSet(spec.tunes, existingTunes)] : []);

    const tunePdfs = await generateTunePdfs(inDir, new Set([...singleTunes, ...bookletTunes]));
    const rotatedTunePdfs = await generateRotatedTunePdfs(tunePdfs, new Set(bookletTunes));
    const pageNumbers = await getPageNumbers(rotatedTunePdfs, new Set([...bookletTunes]));

    for (const spec of specs) {
        if (spec.type === SheetType.SINGLE) {
            await scalePdfToA4(`${tunePdfs.path}/${spec.tune}.pdf`, spec.outFile);
        } else if (spec.type === SheetType.MULTIPLE) {
            for (const tune of resolveTuneSet(spec.tunes, existingTunes)) {
                await scalePdfToA4(`${tunePdfs.path}/${tune}.pdf`, `${spec.outDir}/${tune}.pdf`);
            }
        } else if (spec.type === SheetType.BOOKLET) {
            const frontPdf = await generateFrontOrBackPdf(inDir, "front", spec.tunes, commitId!);
            const backPdf = await generateFrontOrBackPdf(inDir, "back", spec.tunes, commitId!);
            const orderedTunes = orderTunes(resolveTuneSet(spec.tunes, existingTunes), pageNumbers, spec.format);

            const unscaledBookletPdf = await file({ ...TEMP_OPTIONS, postfix: 'unscaled.pdf' });
            await concatPdfs([
                frontPdf.path,
                ...orderedTunes.map((tune) => tune === 'blank' ? `${inDir}/blank.pdf` : `${rotatedTunePdfs.path}/${tune}.pdf`),
                backPdf.path
            ], unscaledBookletPdf.path);

            if (spec.format === SheetFormat.A4) {
                await scalePdfToA4(unscaledBookletPdf.path, spec.outFile);
            } else if (spec.format === SheetFormat.A5) {
                await scalePdfToA5Booklet(unscaledBookletPdf.path, spec.outFile);
            } else if (spec.format === SheetFormat.A6) {
                await scalePdfToA6Booklet(unscaledBookletPdf.path, spec.outFile);
            } else {
                throw new Error(`Unknown format: ${spec.format}`);
            }

            if (!process.env.KEEP_TEMP) {
                await Promise.all([
                    unscaledBookletPdf.cleanup(),
                    frontPdf.cleanup(),
                    backPdf.cleanup()
                ]);
            }
        } else {
            throw new Error(`Unknown sheet type: ${(spec as any).type}`);
        }
    }

    if (!process.env.KEEP_TEMP) {
        await Promise.all([
            tunePdfs.cleanup(),
            rotatedTunePdfs.cleanup()
        ]);
    }
}

/**
 * Convert the given selection of tunes to PDFs in a temporary directory. The tune files are converted to PDF without
 * any modifications, so the resulting files will mostly be landscape or portrait A6 with some possible exceptions.
 * @param inDir The directory to the local working copy of the sheetbook repository (https://github.com/rhythms-of-resistance/sheetbook)
 * @param tunes The list of tunes to convert
 * @return Returns the temporary directory where the PDFs were generated. Call the cleanup method when you are done.
 */
async function generateTunePdfs(inDir: string, tunes: Set<string>): Promise<DirectoryResult> {
    const tmpDir = await dir({ ...TEMP_OPTIONS, postfix: 'tunes', unsafeCleanup: true });

    const files = await Promise.all([...tunes].map(async (tune) => {
        const result = await globby(`${inDir}/${tune}.od{s,t}`);
        if (result.length !== 1) {
            throw new Error(`Could not identify tune ${tune}.`);
        }
        return result[0];
    }));
    await convertOdToPdf(files, tmpDir.path);

    return tmpDir;
}

/**
 * Creates a copy of the tune PDFs in a new temporary directory, rotating the landscape files anti-clockwise to make sure that
 * all PDFs are portrait.
 * @param tunePdfs The temporary directory with the tune PDFs generated by generateTunePdfs()
 * @param tunes The tunes to rotate
 * @return The temporary directory where the PDFs were generated. Call the cleanup method when you are done.
 */
async function generateRotatedTunePdfs(tunePdfs: DirectoryResult, tunes: Set<string>): Promise<DirectoryResult> {
    const tmpDir = await dir({ ...TEMP_OPTIONS, postfix: 'tunes-rotated', unsafeCleanup: true });

    for (const tune of tunes) {
        await pdfToPortrait(`${tunePdfs.path}/${tune}.pdf`, `${tmpDir.path}/${tune}.pdf`);
    }

    return tmpDir;
}

/**
 * Generates the front or back cover as PDF. These are generated from their SVG files in the sheetbook repository. The SVG
 * files can contain placeholders for the current month+year and the current git commit ID, which are filled in by this method.
 * @param inDir The directory to the local working copy of the sheetbook repository (https://github.com/rhythms-of-resistance/sheetbook)
 * @param which Whether to generate the front or back cover
 * @param tunes The selected (unresolved) tune set. This is used to generate a suffix to the sheetbook version, for example "(all)" or "(no-ca)".
 * @param commitId The git commit id, as resolved by getCommitId()
 * @return The temporary file containing the cover PDF. Call the cleanup method when you are done.
 */
async function generateFrontOrBackPdf(inDir: string, which: 'front' | 'back', tunes: TuneSet | string[], commitId: string): Promise<FileResult> {
    const [frontSvgTemplate, tmpSvg, result] = await Promise.all([
        fs.readFile(`${inDir}/${which}.svg`).then((b) => b.toString('utf8')),
        file({ ...TEMP_OPTIONS, postfix: `${which}.svg` }),
        file({ ...TEMP_OPTIONS, postfix: `${which}.pdf` })
    ]);

    const frontSvg = frontSvgTemplate
        .replace(/\[month\]/g, dayjs().format("MMMM YYYY"))
        .replace(/\[version\]/g, `${commitId} (${typeof tunes === 'string' ? tunes : 'custom'})`);

    await fs.writeFile(tmpSvg.path, frontSvg, { encoding: 'utf8' });

    await convertSvgToPdf(tmpSvg.path, result.path);

    if (!process.env.KEEP_TEMP) {
        await tmpSvg.cleanup();
    }
    return result;
}

/**
 * Determines the total number of pages for each tune.
 * @param tunePdfs The temporary directory with the tune PDFs generated by generateTunePdfs()
 * @param tunes The tunes to determine
 * @return A map of tune name to page count
 */
async function getPageNumbers(tunePdfs: DirectoryResult, tunes: Set<string>): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const tune of tunes) {
        result.set(tune, await getNumberOfPages(`${tunePdfs.path}/${tune}.pdf`));
    }
    return result;
}

/**
 * Returns a list of all tunes available, based on the list of files in a local working copy of the sheetbook repository.
 * @param inDir The directory to the local working copy of the sheetbook repository (https://github.com/rhythms-of-resistance/sheetbook)
 */
export async function getExistingTunes(inDir: string): Promise<string[]> {
    return extractExistingTunes(await globby(`${inDir}/*.ods`));
}

/**
 * Returns a list of all tunes available, based on a list of files provided as an argument.
 * @params files A list of filenames of the root directory of the sheetbook repository (https://github.com/rhythms-of-resistance/sheetbook)
 */
export function extractExistingTunes(files: string[]): string[] {
    return [
        'cultural-appropriation-summary',
        'history',
        'network',
        'player',
        ...files.map((f) => f.match(/([^/]+)\.ods$/)?.[1]).filter((f) => f && f !== 'breaks_large') as string[]
    ];
}

/**
 * Resolves the given tune set to a list of tunes. If the tune set is already a list of tunes, that list is returned unchanged.
 * @param tunes The tune set
 * @param existingTunes The list of existing tunes as returned by getExistingTunes
 */
export function resolveTuneSet(tunes: TuneSet | string[], existingTunes: string[]): Set<string> {
    if (typeof tunes !== 'string') {
        return new Set(tunes);
    }

    switch (tunes) {
        case TuneSet.ALL:
            return new Set(existingTunes);

        case TuneSet.NO_CA:
            return new Set(existingTunes.filter((t) => !CA_TUNES.includes(t)));

        default:
            return new Set();
    }
}

/**
 * Returns the total number of pages of the specified tune PDFs concatenated together.
 * @param tunes The list of tunes to concatenate
 * @param pageNumbers The number of pages of all tunes, as generated by getPageNumbers()
 */
function getTotalPageNumber(tunes: string[], pageNumbers: Map<string, number>): number {
    return tunes.map((t) => {
        if (t === 'blank') {
            return 1;
        }

        const number = pageNumbers.get(t);
        if (number == null) {
            throw new Error(`Unknown page number for tune ${t}`);
        }
        return number;
    }).reduce((p, c) => p + c, 0);
}

/** Sections that should appear before the alphabetically ordered tunes section, in this order. */
const BEFORE_TUNES = ['history', 'network', 'cultural-appropriation-summary', 'player', 'breaks'];
/** Sections that should appear after the alphabetically ordered tunes section, in this order. */
const AFTER_TUNES = ['dances'];

/**
 * Returns the given selection of tunes sorted as they would appear in a sheetbook, without reordering to match double pages
 * and without inserting blank pages.
 */
export function sortTunes(tunes: Set<string>): string[] {
    return [
        ...BEFORE_TUNES.filter((t) => tunes.has(t)),
        ...[...tunes].filter((t) => !BEFORE_TUNES.includes(t) && !AFTER_TUNES.includes(t)).sort(),
        ...AFTER_TUNES.filter((t) => tunes.has(t))
    ];
}

/**
 * Orders the given list of tunes to be concatenated. network and breaks come first, dances come last. Everything else is ordered
 * alphabetically. Blank pages are inserted to make sure that the total number of pages is dividable by 2 (for A4) or by 4 (for A5/A6).
 * Double-page tunes are moved out of order if they are not aligned with a double page (not starting at an even page number).
 * @param tunes The set of tunes to include. May include breaks, network and dances, but not front and back.
 * @param pageNumbers The number of pages of all tunes as returned by getPageNumbers()
 * @param format The format which the booklet will have. This is used to determine whether the total page number needs to be dividable
 *               by 2 or by 4.
 * @return The ordered list of tunes. May include additional "blank" tunes (for blank pages).
 */
function orderTunes(tunes: Set<string>, pageNumbers: Map<string, number>, format: SheetFormat): string[] {
    const result: string[] = [];
    const totalPages = () => getTotalPageNumber(result, pageNumbers);

    result.push(...BEFORE_TUNES.filter((t) => tunes.has(t)));

    result.push(...alignTunes([...tunes].filter((t) => !BEFORE_TUNES.includes(t) && !AFTER_TUNES.includes(t)).sort(), pageNumbers, totalPages()));

    result.push(...AFTER_TUNES.filter((t) => tunes.has(t)));

    while (!(format === SheetFormat.A4 ? [0, 2] : [2]).includes(totalPages() % 4)) {
        result.push('blank');
    }

    return result;
}

/**
 * Moves double-page tunes out of order in the given ordered list of tunes, to make sure they always start on an even page so that they
 * can be viewed at once on a double page in the printed booklet.
 * @param tunes The ordered list of tunes, without breaks, network, dances.
 * @param pageNumbers The number of pages of all tunes as generated by getPageNumbers()
 * @param offset How many pages (with breaks, network, but without front cover) there will be before the tunes in the printed booklet
 */
export function alignTunes(tunes: string[], pageNumbers: Map<string, number>, offset = 0): string[] {
    const totalPages = (t: string[]) => getTotalPageNumber(t, pageNumbers) + offset;

    const result = [...tunes];
    for (const tune of tunes) {
        const idx = result.indexOf(tune);
        if (pageNumbers.get(tune) === 2 && totalPages(result.slice(0, idx)) % 2 === 1) {
            result.splice(idx, 1);
            let newIndex = 0;
            for (let i = 0; i <= result.length; i++) {
                if (totalPages(result.slice(0, i)) % 2 === 0 && Math.abs(i - idx) <= Math.abs(newIndex - idx)) {
                    newIndex = i;
                }
            }
            result.splice(newIndex, 0, tune);
        }
    }
    return result;
}