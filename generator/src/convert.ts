import { $ } from "zx";
import { dir, file } from "tmp-promise";
import { TEMP_OPTIONS } from "../../config";
import { promises as fs } from "fs";

/** Represents an empty page. */
export const BLANK = 'blank';

/**
 * Convert one or multiple ODT or ODS files to PDF.
 * @param inFile A list of file paths of the input ODT and ODS files
 * @param outDir A directory path where the PDFs should be stored. The PDFs will have the same filename as the input files,
 *               with the extension replaced by .pdf.
 */
export async function convertOdToPdf(inFile: string[] | string, outDir: string): Promise<void> {
    if (Array.isArray(inFile) && inFile.length === 0) {
        return;
    }

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
 * Generates a PDF file that contains all the pages of all the input files concatenated, in order. Landscape pages
 * are rotated anti-clockwise, so all output pages are portrait. Pages are scaled to A4. Page numbers are added
 * on the top right of each page, except the first and last page.
 * @param inFiles A list of PDF files or BLANK for empty pages.
 */
export async function concatPdfsToPortraitA4WithPageNumbers(inFiles: string[], outFile: string): Promise<void> {
    await runPdfLatex(
`\\documentclass{book}
\\usepackage[a4paper,top=15mm,bottom=24mm,left=15mm,right=15mm]{geometry}
\\usepackage[final]{pdfpages}
\\usepackage{fancyhdr}
\\usepackage{fontspec}
\\setmainfont{Arial}
\\fancyhead{}
\\fancyfoot{}
\\fancyfoot[LE,RO]{\\small \\thepage}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\includepdfset{pages=-}
\\pagestyle{fancy}

% See https://tex.stackexchange.com/a/395847
\\newsavebox{\\temp}
\\newlength{\\tempwidth}
\\newlength{\\tempheight}
\\newcommand{\\addpdf}[2][fancy]{%
    \\sbox{\\temp}{\\includegraphics{#2}}%
    \\setlength{\\tempwidth}{\\widthof{\\usebox{\\temp}}}%
    \\setlength{\\tempheight}{\\heightof{\\usebox{\\temp}}}%

    \\ifthenelse{\\tempwidth > \\tempheight}
        {\\includepdf[pagecommand=\\thispagestyle{#1},angle=90]{#2}}
        {\\includepdf[pagecommand=\\thispagestyle{#1}]{#2}}
}

\\begin{document}
    ${inFiles.map((f, i) => f === BLANK ? '\\null\\newpage' : `\\addpdf${i === 0 || i === inFiles.length - 1 ? '[empty]' : ''}{${f}}`).join('\n    ')}
\\end{document}
`, outFile);
}

/**
 * Runs the specified LaTeX script, generating the PDF file outFile.
 */
export async function runPdfLatex(script: string, outFile: string): Promise<void> {
    const tmpDir = await dir({ ...TEMP_OPTIONS, postfix: 'pdflatex', unsafeCleanup: true });
    try {
        await fs.writeFile(`${tmpDir.path}/script.tex`, script);

        // Print tex file to log
        await $`cat ${tmpDir.path}/script.tex`;

        await $`xelatex -halt-on-error -output-directory=${tmpDir.path} ${tmpDir.path}/script.tex`;
        await $`mv ${tmpDir.path}/script.pdf ${outFile}`;
    } finally {
        if (!process.env.KEEP_TEMP) {
            await tmpDir.cleanup();
        }
    }
}