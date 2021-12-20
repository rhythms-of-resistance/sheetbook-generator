import { MIN_PULL_INTERVAL, SHEETBOOK_DIR, SHEETBOOK_REPO, TUNE_DISPLAY_NAME, TUNE_SETS } from '../../../config';
import { fileExists } from './utils';
import { gitClone, gitFetch, resolveTuneSet, extractExistingTunes, gitLsTree, sortTunes } from 'ror-sheetbook-generator/src';
import { TunesInfo } from 'ror-sheetbook-common';

let lastPull: number | undefined = undefined;

export async function cloneRepository(): Promise<void> {
    if (!await fileExists(SHEETBOOK_DIR)) {
        await gitClone(SHEETBOOK_REPO, SHEETBOOK_DIR, { mirror: true });
    }
}

export async function pull(): Promise<void> {
    if (lastPull != null && Date.now() - lastPull < MIN_PULL_INTERVAL * 1000) {
        return;
    }

    await gitFetch(SHEETBOOK_DIR);
    lastPull = Date.now();
}

export async function getTunesInfo(treeish: string): Promise<TunesInfo> {
    await pull();

    const existingTunes = sortTunes(new Set(extractExistingTunes(await gitLsTree(SHEETBOOK_DIR, treeish, { nameOnly: true }))));
    return {
        existingTunes: existingTunes.map((tuneName) => ({
            name: tuneName,
            displayName: TUNE_DISPLAY_NAME(tuneName)
        })),
        tuneSets: Object.fromEntries(Object.keys(TUNE_SETS).map((set) => [set, [...resolveTuneSet(set, existingTunes)]]))
    };
}