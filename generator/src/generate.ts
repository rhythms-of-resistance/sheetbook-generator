import { dir, DirectoryResult, file, FileResult } from "tmp-promise";
import { globby } from "zx";
import { concatPdfs, convertOdToPdf, convertSvgToPdf, getNumberOfPages, pdfToPortrait, scalePdfToA4, scalePdfToA5Booklet, scalePdfToA6Booklet } from "./convert";
import { promises as fs } from "fs";
import dayjs from "dayjs";
import { getCommitId } from "./git";
import { CA_TUNES, TEMP_OPTIONS } from "../../config";

export enum SheetType {
    SINGLE = 'single',
    MULTIPLE = 'multiple',
    BOOKLET = 'booklet'
}

export enum SheetFormat {
    A4 = 'a4',
    A5 = 'a5',
    A6 = 'a6'
}

export enum TuneSet {
    ALL = 'all',
    NO_CA = 'no-ca'
}

export type SheetbookSpec = (
    { type: SheetType.SINGLE; tune: string; outFile: string } |
    { type: SheetType.MULTIPLE; tunes: TuneSet | Set<string>; outDir: string } |
    { type: SheetType.BOOKLET; tunes: TuneSet | Set<string>; format: SheetFormat; outFile: string }
);

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

async function generateRotatedTunePdfs(tunePdfs: DirectoryResult, tunes: Set<string>): Promise<DirectoryResult> {
    const tmpDir = await dir({ ...TEMP_OPTIONS, postfix: 'tunes-rotated', unsafeCleanup: true });

    for (const tune of tunes) {
        await pdfToPortrait(`${tunePdfs.path}/${tune}.pdf`, `${tmpDir.path}/${tune}.pdf`);
    }

    return tmpDir;
}

async function generateFrontOrBackPdf(inDir: string, which: 'front' | 'back', tunes: TuneSet | Set<string>, commitId: string): Promise<FileResult> {
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

async function getPageNumbers(tunePdfs: DirectoryResult, tunes: Set<string>): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const tune of tunes) {
        result.set(tune, await getNumberOfPages(`${tunePdfs.path}/${tune}.pdf`));
    }
    return result;
}

async function getExistingTunes(inDir: string): Promise<string[]> {
    const odsFiles = await globby(`${inDir}/*.ods`);
    return ['network', ...odsFiles.map((f) => f.match(/([^/]+)\.ods$/)![1]).filter((f) => f !== 'breaks_large')];
}

function resolveTuneSet(tunes: TuneSet | Set<string>, existingTunes: string[]): Set<string> {
    if (typeof tunes !== 'string') {
        return tunes;
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

function getTotalPageNumber(tunes: string[], pageNumbers: Map<string, number>) {
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

function orderTunes(tunes: Set<string>, pageNumbers: Map<string, number>, format: SheetFormat): string[] {
    const result: string[] = [];
    const totalPages = () => getTotalPageNumber(result, pageNumbers);

    if (tunes.has('breaks')) {
        result.push('breaks');
    }
    if (tunes.has('network')) {
        result.push('network');
    }

    result.push(...alignTunes([...tunes].filter((t) => !['breaks', 'network', 'dances'].includes(t)).sort(), pageNumbers, totalPages()));

    while (totalPages() % 2 > 0) {
        result.push('blank');
    }

    if (tunes.has('dances')) {
        result.push('dances');
    }

    while (!(format === SheetFormat.A4 ? [0, 2] : [2]).includes(totalPages() % 4)) {
        result.push('blank');
    }

    return result;
}

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