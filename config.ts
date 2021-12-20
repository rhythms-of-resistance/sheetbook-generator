import { BookletSheetbookSpec, DistributiveOmit, SheetType, SingleSheetbookSpec } from "ror-sheetbook-common";
import { TmpNameOptions } from "tmp";

// This file configures the behaviour of the server, frontend and generator CLI. Although all modules load the
// configuration, most entries are not relevant to all of them.


/** The port where the HTTP server should listen. */
export const PORT = 8955;

/** The IP address where the HTTP server should listen. Leave undefined to listen on all addresses. */
export const HOST: string | undefined = undefined;

/** Options to pass to tmp.file() and tmp.dir(). */
export const TEMP_OPTIONS: TmpNameOptions = {
    prefix: "ror-sheetbook"
};

/** Minimum time between two git pulls in seconds. */
export const MIN_PULL_INTERVAL = 60;

/** URL of the sheetbook Git repository. */
export const SHEETBOOK_REPO = 'https://github.com/rhythms-of-resistance/sheetbook.git';

/** Git branch of the sheetbook repository to use. */
export const MAIN_BRANCH = 'develop';


const DATA_DIR = process.env.DATA_DIR || `${__dirname}/data`;

/** Local directory where to store temporary files during PDF creation. */
export const TEMP_DIR = `${DATA_DIR}/temp`;

/** Local directory where to store generated PDFs for download. */
export const DOWNLOADS_DIR = `${DATA_DIR}/downloads`;

/** Local directory where to store a mirror clone of the sheetbook repository. */
export const SHEETBOOK_DIR = `${DATA_DIR}/sheetbook.git`;


/** How long to keep generated downloads, in seconds. */
export const DOWNLOAD_PRESERVE_TIME = 3600;

/** Timeout for sheetbook generation, in seconds. */
export const GENERATE_SHEET_TIMEOUT = 600;


/** Tunes that should always be placed first, regardless of their alphabetical order. */
export const TUNES_BEFORE = ['history', 'network', 'cultural-appropriation-summary', 'player', 'breaks', 'breaks_large'];

/** Tunes that should always be placed last, regardless of their alphabetical order. */
export const TUNES_AFTER = ['dances', 'cultural-appropriation-booklet'];

/** Tune sets that can be picked in the frontend and CLI. */
export const TUNE_SETS: Record<string, { label: string; pick: (existingTunes: string[]) => string[] }> = {
    'no-ca': {
        label: 'All tunes (without controversial cultural appropriation tunes)',
        pick: (existingTunes) => existingTunes.filter((t) => !['breaks_large', 'cultural-appropriation-booklet', 'afoxe', 'custard', 'samba-reggae', 'sheffield-samba-reggae', 'voodoo', 'xango'].includes(t))
    },
    'all': {
        label: 'All tunes',
        pick: (existingTunes) => existingTunes.filter((t) => !['breaks_large', 'cultural-appropriation-booklet'].includes(t))
    },
    'ca-booklet': {
        label: 'Cultural appropriation booklet',
        pick: () => ['cultural-appropriation-booklet']
    }
};

/** File name of the PDF file containing a blank page (without extension). */
export const BLANK = 'blank';

/** File name of the front cover PDF file (without extension). */
export const FRONT = (spec: BookletSheetbookSpec, existingTunes: string[]): string => {
    const tunes = Array.isArray(spec.tunes) ? spec.tunes : Object.prototype.hasOwnProperty.call(TUNE_SETS, spec.tunes) ? TUNE_SETS[spec.tunes].pick(existingTunes) : [];
    return tunes.length === 1 && tunes[0] === 'cultural-appropriation-booklet' ? 'front_ca-booklet' : 'front';
};

/** File name of the back cover PDF file (without extension). */
export const BACK = (spec: BookletSheetbookSpec, existingTunes: string[]): string => 'back';

/** Map a tune filename to a tune display name. */
export const TUNE_DISPLAY_NAME = (tuneName: string): string => (
    {
        network: 'Network & Principles',
        player: 'RoR Player & Tube'
    }[tuneName] ?? tuneName.split(/[-_]/).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ')
);

/** File name of the generated PDF files (without extension). */
export const OUTPUT_FILENAME = (spec: DistributiveOmit<SingleSheetbookSpec | BookletSheetbookSpec, 'outFile'>): string => (
    spec.type === SheetType.SINGLE ? spec.tune :
    spec.tunes === 'ca-booklet' ? `${spec.tunes}-${spec.format}` :
    `tunesheet-${spec.format}-${typeof spec.tunes === 'string' ? spec.tunes : 'custom'}`
);