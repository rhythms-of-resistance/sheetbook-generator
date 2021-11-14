import { TmpNameOptions } from "tmp";

export const PORT = 8955;
export const HOST: string | undefined = undefined;
export const CA_TUNES = ['afoxe', 'custard', 'samba-reggae', 'sheffield-samba-reggae', 'voodoo', 'xango'];
export const TEMP_OPTIONS: TmpNameOptions = {
    prefix: "ror-sheetbook"
};

/** Minimum time between two git pulls in seconds. */
export const MIN_PULL_INTERVAL = 60;

export const SHEETBOOK_REPO = 'https://github.com/rhythms-of-resistance/sheetbook.git';
export const MAIN_BRANCH = 'origin/develop';

export const DATA_DIR = process.env.DATA_DIR || `${__dirname}/data`;
export const DOWNLOADS_DIR = `${DATA_DIR}/downloads`;
export const SHEETBOOK_DIR = `${DATA_DIR}/sheetbook`;

/** How long to keep generated downloads, in seconds. */
export const DOWNLOAD_PRESERVE_TIME = 3600;