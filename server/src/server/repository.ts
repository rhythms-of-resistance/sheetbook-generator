import { MIN_PULL_INTERVAL, SHEETBOOK_DIR, SHEETBOOK_REPO } from '../../../config';
import { fileExists } from './utils';
import { gitClone, gitFetch, resolveTuneSet, extractExistingTunes, gitLsTree, sortTunes } from 'ror-sheetbook-generator/src';
import { TuneSet, TunesInfo } from 'ror-sheetbook-common';
import { upperFirst } from 'lodash';

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
            displayName: {
                network: 'Network & Principles',
                player: 'RoR Player & Tube'
            }[tuneName] ?? tuneName.split(/[-_]/).map(upperFirst).join(' ')
        })),
        tuneSets: Object.fromEntries(Object.values(TuneSet).map((set) => [set, [...resolveTuneSet(set, existingTunes)]])) as Record<TuneSet, string[]>
    };
}