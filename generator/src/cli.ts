#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateSheets } from './generate';
import mkdirp from 'mkdirp';
import tmp from 'tmp';
import { SheetbookSpec, SheetFormat, SheetType } from 'ror-sheetbook-common';
import { OUTPUT_FILENAME, TUNE_SETS } from '../../config';

const args = yargs(hideBin(process.argv))
    .strict(true)
    .usage("Usage: $0 -i <sheetbook dir> -o <output dir> <specification...>")
    .option("sheetbook", {
        alias: "i",
        describe: "The sheetbook directory.",
        demandOption: true,
        type: "string"
    })
    .option("outdir", {
        alias: "o",
        describe: "The output directory.",
        demandOption: true,
        type: "string"
    })
    .option("keep", {
        alias: "k",
        describe: "Keep temporary files.",
        type: "boolean"
    })
    .demandCommand(1, 'At least 1 specification needs to be passed.')
    .epilogue(
        'The sheetbook specification can be one or multiple of:\n' +
        'single:<tunes>           to generate single-tune A4 PDFs, for example\n' +
        '                         single:all, single:no-ca or single:angela-davis,funk\n' +
        'booklet:<format>:<tunes> to generate a booklet, for example booklet:A4:all,\n' +
        '                         booklet:A5:no-ca or booklet:A6:breaks,network,angela-davis,funk,dances\n' +
        '\n' +
        '<format> can be A4 (booklet of portrait A4 pages), A5 (booklet with two A5 portrait pages per landscape A4 page) or A6 (double booklet with four portrait A6 pages per portrait A4 page).\n' +
        '\n' +
        `<tunes> can be ${Object.entries(TUNE_SETS).map(([k, v]) => `"${k}" (${v.label})`).join(', ')} or a list of tunes (comma-separated).\n` +
        '\n' +
        'To generate all tunesheets in all sizes:\n' +
        `$0 -i /sheetbook -o /sheetbook/generated single:all booklet:{${Object.values(SheetFormat).join(',')}}:{${Object.keys(TUNE_SETS).join(',')}}`
    )
    .parse();

function argsToSpecs(cmds: Array<string | number>, outDir: string): SheetbookSpec[] {
    let customCounter = 0;

    return cmds.map((cmd): SheetbookSpec => {
        const split = String(cmd).split(':');
        if (split[0] === 'single') {
            return {
                type: SheetType.MULTIPLE,
                tunes: Object.keys(TUNE_SETS).includes(split[1]) ? split[1] : split[1].split(','),
                outDir: `${outDir}/single`
            };
        } else if (split[0] === 'booklet') {
            if (!Object.values(SheetFormat).includes(split[1] as SheetFormat)) {
                throw new Error(`Unknown format: ${split[1]}`);
            }

            const spec = {
                type: SheetType.BOOKLET as const,
                tunes: Object.prototype.hasOwnProperty.call(TUNE_SETS, split[2]) ? split[2] : split[2].split(','),
                format: split[1] as SheetFormat
            };

            return {
                ...spec,
                outFile: `${outDir}/${OUTPUT_FILENAME(spec)}${Array.isArray(spec.tunes) && customCounter++ > 0 ? customCounter : ''}.pdf`
            };
        } else {
            throw new Error(`Unknown sheet type: ${split[0]}`);
        }
    })
}

(async () => {
    if (args.keep) {
        process.env.KEEP_TEMP = '1';
    } else {
        tmp.setGracefulCleanup();
    }

    const specs = argsToSpecs(args._, args.outdir);

    await mkdirp(specs.some((spec) => spec.type === SheetType.MULTIPLE) ? `${args.outdir}/single` : args.outdir);

    await generateSheets(args.sheetbook, specs);
})();