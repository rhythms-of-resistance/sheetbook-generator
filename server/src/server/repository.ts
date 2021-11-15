import { MIN_PULL_INTERVAL, SHEETBOOK_DIR, SHEETBOOK_REPO } from '../../../config';
import { fileExists } from './utils';
import { gitClone, gitFetch, resolveTuneSet, extractExistingTunes, gitLsTree } from 'ror-sheetbook-generator/src';
import { TuneSet, TunesInfo } from 'ror-sheetbook-common';
import { upperFirst } from 'lodash';

let lastPull: number | undefined = undefined;

export async function cloneRepository(): Promise<void> {
    if (!await fileExists(SHEETBOOK_DIR)) {
        await gitClone(SHEETBOOK_REPO, SHEETBOOK_DIR, { bare: true });
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

    const existingTunes = extractExistingTunes(await gitLsTree(SHEETBOOK_DIR, treeish, { nameOnly: true }));
    return {
        existingTunes: ['network', 'breaks', ...existingTunes.filter((t) => !['breaks', 'network', 'dances'].includes(t)).sort(), 'dances'].map((tuneName) => ({
            name: tuneName,
            displayName: { network: 'Network description' }[tuneName] ?? tuneName.split('-').map(upperFirst).join(' ')
        })),
        tuneSets: Object.fromEntries(Object.values(TuneSet).map((set) => [set, [...resolveTuneSet(set, existingTunes)]])) as Record<TuneSet, string[]>
    };
}