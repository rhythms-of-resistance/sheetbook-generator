import { $ } from "zx";
import { file } from "tmp-promise";
import { TEMP_OPTIONS } from "../../config";

/**
 * Convert one or multiple ODT or ODS files to PDF.
 * @param inFile A list of file paths of the input ODT and ODS files
 * @param outDir A directory path where the PDFs should be stored. The PDFs will have the same filename as the input files,
 *               with the extension replaced by .pdf.
 */
export async function convertOdToPdf(inFile: string[] | string, outDir: string): Promise<void> {
    await $`libreoffice --convert-to pdf ${inFile} --outdir ${outDir}`;
}

/**
 * Convert a single SVG file to PDF.
 * @param inFile The path of the SVG file
 * @param outFile The path of the PDF file to be generated
 */
export async function convertSvgToPdf(inFile: string, outFile: string): Promise<void> {
    await $`inkscape ${inFile} --export-filename=${outFile} --export-type=pdf`;
}

/**
 * Returns true if the given PDF file is in landscape format, that is if the width of its first page is greater than
 * its height.
 * @param inFile The path of the PDF file
 */
export async function isLandscapePdf(inFile: string): Promise<boolean> {
    const output = await $`pdfinfo ${inFile} | grep -F 'Page size:'`;
    const m = output.stdout.match(/([0-9.]+) x ([0-9.]+)/);
    if (!m) {
        throw new Error(`Could not parse output size: ${output.stdout}`);
    }
    return Number(m[1]) > Number(m[2]);
}

/**
 * Returns the number of pages in the given PDF file.
 * @param inFile The path of the PDF file
 */
export async function getNumberOfPages(inFile: string): Promise<number> {
    const output = await $`pdfinfo ${inFile} | grep -F 'Pages:'`;
    const m = output.stdout.match(/([0-9]+)/);
    if (!m) {
        throw new Error(`Could not parse number of pages: ${output.stdout}`);
    }
    return Number(m[1]);
}

/**
 * Creates a copy of the given PDF file scaled to landscape A4 or portrait A4, depending on the orientation of the source file.
 * @param inFile The path of the PDF file to scale
 * @param outFile The path of the scaled PDF file to be generated
 */
export async function scalePdfToA4(inFile: string, outFile: string): Promise<void> {
    const isLandscape = await isLandscapePdf(inFile);
    await $`pdfjam --outfile ${outFile} --paper a4paper ${isLandscape ? ['--landscape'] : []} ${inFile}`;
}

/**
 * Arranges the pages of the given PDF file into an A5 booklet. The generated file will be in landscape A4 format, with each page
 * containing two pages of the input file scaled to portrait A5. The pages will be rearranged in such a way that when printing the
 * output file double-sided on A4, it can be bound into an A5 booklet. The page count of the input file needs to be dividable by 4.
 * @param inFile The path of the input PDF file
 * @param outFile The path of the output PDF file to be generated
 */
export async function scalePdfToA5Booklet(inFile: string, outFile: string): Promise<void> {
    const n = await getNumberOfPages(inFile);
    if (n % 4 != 0) {
        throw new Error(`Number of pages is ${n}, but needs to be divisable by 4.`);
    }

    const pages = [];
    for (let i = 1; i <= n/2; i += 2) {
        pages.push(n-i+1, i, i+1, n-i);
    };

    const tmp = await file({ ...TEMP_OPTIONS, postfix: 'ordered-a5.pdf' });
    await $`qpdf ${inFile} --pages . ${pages.join(',')} -- ${tmp.path}`;
    await $`pdfjam --outfile ${outFile} --nup 2x1 --paper a4paper --landscape ${tmp.path}`;
    await tmp.cleanup();
}

/**
 * Arranges the pages of the given PDF file into an A6 booklet. The generated file will be in portrait A4 format, with each page
 * containing 2x2 pages of the input file scaled to portrait A6. The pages will be rearranged in such a way that when printing the
 * output file double-sided on A4, it can be cut in half and bound into two A6 booklets. The page count of the input file needs to
 * be dividable by 4.
 * @param inFile The path of the input PDF file
 * @param outFile The path of the output PDF file to be generated
 */
export async function scalePdfToA6Booklet(inFile: string, outFile: string): Promise<void> {
    const n = await getNumberOfPages(inFile);
    if (n % 4 != 0) {
        throw new Error(`Number of pages is ${n}, but needs to be divisable by 4.`);
    }

    const pages = [];
    for (let i = 1; i <= n/2; i += 2) {
        pages.push(n-i+1, i, n-i+1, i, i+1, n-i, i+1, n-i);
    };

    const tmp = await file({ ...TEMP_OPTIONS, postfix: 'ordered-a6.pdf' });
    await $`qpdf ${inFile} --pages . ${pages.join(',')} -- ${tmp.path}`;
    await $`pdfjam --outfile ${outFile} --nup 2x2 --paper a4paper --no-landscape ${tmp.path}`;
    await tmp.cleanup();
}

/**
 * Creates a copy of the given PDF file, with its orientation normalized to portrait. If the input file is already
 * in portrait mode, a simple copy of it is made. If the input file is in landscape mode, it is rotated anti-clockwise.
 * @param inFile The path of the input file
 * @param outFile The path of the output file to be generated
 */
export async function pdfToPortrait(inFile: string, outFile: string): Promise<void> {
    if (await isLandscapePdf(inFile)) {
        await $`qpdf ${inFile} --rotate=-90 ${outFile}`;
    } else {
        await $`cp ${inFile} ${outFile}`;
    }
}

/**
 * Generates a PDF file that contains all the pages of all the input files concatenated, in order.
 * @param inFiles The paths of the PDF input files, in order
 * @param outFile The path of the output file to be generated
 */
export async function concatPdfs(inFiles: string[], outFile: string): Promise<void> {
    await $`qpdf --empty --pages ${inFiles.flatMap((f) => [f, '1-z'])} -- ${outFile}`;
}