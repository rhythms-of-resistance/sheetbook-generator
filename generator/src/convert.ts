import { $, ProcessOutput } from "zx";
import { file } from "tmp-promise";
import { TEMP_OPTIONS } from "../../config";

export async function convertOdToPdf(inFile: string[] | string, outDir: string): Promise<void> {
    await $`libreoffice --convert-to pdf ${inFile} --outdir ${outDir}`;
}

export async function convertSvgToPdf(inFile: string, outFile: string): Promise<void> {
    await $`inkscape ${inFile} --export-filename=${outFile} --export-type=pdf`;
}

export async function isLandscapePdf(inFile: string): Promise<boolean> {
    const output = await $`pdfinfo ${inFile} | grep -F 'Page size:'`;
    const m = output.stdout.match(/([0-9.]+) x ([0-9.]+)/);
    if (!m) {
        throw new Error(`Could not parse output size: ${output.stdout}`);
    }
    return Number(m[1]) > Number(m[2]);
}

export async function getNumberOfPages(inFile: string): Promise<number> {
    const output = await $`pdfinfo ${inFile} | grep -F 'Pages:'`;
    const m = output.stdout.match(/([0-9]+)/);
    if (!m) {
        throw new Error(`Could not parse number of pages: ${output.stdout}`);
    }
    return Number(m[1]);
}

export async function scalePdfToA4(inFile: string, outFile: string): Promise<void> {
    const isLandscape = await isLandscapePdf(inFile);
    await $`pdfjam --outfile ${outFile} --paper a4paper ${isLandscape ? ['--landscape'] : []} ${inFile}`;
}

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

export async function pdfToPortrait(inFile: string, outFile: string): Promise<void> {
    if (await isLandscapePdf(inFile)) {
        await $`qpdf ${inFile} --rotate=-90 ${outFile}`;
    } else {
        await $`cp ${inFile} ${outFile}`;
    }
}

export async function concatPdfs(inFiles: string[], outFile: string): Promise<void> {
    await $`qpdf --empty --pages ${inFiles.flatMap((f) => [f, '1-z'])} -- ${outFile}`;
}