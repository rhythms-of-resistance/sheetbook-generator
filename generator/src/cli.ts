#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateSheets } from './generate';
import mkdirp from 'mkdirp';
import tmp from 'tmp';
import { SheetbookSpec, SheetFormat, SheetType, TuneSet } from 'ror-sheetbook-common';

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
        '<tunes> can be a list of tunes (comma-separated), "all" (for all tunes), "no-ca" (for all except controversial cultural appropriation tunes) or "ca-booklet" (cultural appropriation booklet).\n' +
        '\n' +
        'To generate all tunesheets in all sizes:\n' +
        '$0 -i /sheetbook -o /sheetbook/generated single:all booklet:{a4,a5,a6}:{all,no-ca,ca-booklet}'
    )
    .parse();

function argsToSpecs(cmds: Array<string | number>, outDir: string): SheetbookSpec[] {
    let customCounter = 0;

    return cmds.map((cmd): SheetbookSpec => {
        const split = String(cmd).split(':');
        if (split[0] === 'single') {
            return {
                type: SheetType.MULTIPLE,
                tunes: Object.values(TuneSet).includes(split[1] as TuneSet) ? split[1] as TuneSet : split[1].split(','),
                outDir: `${outDir}/single`
            };
        } else if (split[0] === 'booklet') {
            if (!Object.values(SheetFormat).includes(split[1] as SheetFormat)) {
                throw new Error(`Unknown format: ${split[1]}`);
            }
            const filename = (
                split[2] === TuneSet.CA_BOOKLET ? `${split[2]}-${split[1]}` :
                Object.values(TuneSet).includes(split[2] as TuneSet) ? `tunesheet-${split[1]}-${split[2]}` :
                `tunesheet-${split[1]}-custom${customCounter++ > 0 ? customCounter : ''}`
            );
            return {
                type: SheetType.BOOKLET,
                tunes: Object.values(TuneSet).includes(split[2] as TuneSet) ? split[2] as TuneSet : split[2].split(','),
                format: split[1] as SheetFormat,
                outFile: `${outDir}/${filename}.pdf`
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