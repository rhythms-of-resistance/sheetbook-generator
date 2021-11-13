import { MAIN_BRANCH, MIN_PULL_INTERVAL, SHEETBOOK_DIR, SHEETBOOK_REPO } from '../../config';
import { fileExists } from './utils';
import { gitClone, getExistingTunes, gitFetch, gitResetAndCheckout, resolveTuneSet } from 'ror-sheetbook-generator/src';
import { TuneSet, TunesInfo } from 'ror-sheetbook-common';
import { upperFirst } from 'lodash';

let lastPull: number | undefined = undefined;
let lastTuneInfo: TunesInfo | undefined;

let lockQueue: Promise<any> = Promise.resolve();

export async function lockRepository<T>(callback: () => Promise<T>): Promise<T>;
export async function lockRepository<T>(callback: () => Promise<T>, timeout: number): Promise<T | undefined>;
export async function lockRepository<T>(callback: () => Promise<T>, timeout?: number): Promise<T | undefined> {
    const logTimeout = setTimeout(() => {
        console.log('Waiting for other jobs to finish...');
    }, 500);

    let started = false;
    let timedout = false;

    lockQueue = lockQueue.then(() => {
        clearTimeout(logTimeout);
        if (!timedout) {
            started = true;
            return callback();
        }
    });

    return await new Promise<T | undefined>((resolve, reject) => {
        if (timeout != null) {
            setTimeout(() => {
                clearTimeout(logTimeout);
                if (!started) {
                    timedout = true;
                    resolve(undefined);
                }
            }, timeout);
        }

        lockQueue.then(resolve).catch(reject);
    });
}

export async function pull(): Promise<void> {
    if (lastPull != null && Date.now() - lastPull < MIN_PULL_INTERVAL * 1000) {
        return;
    }

    await lockRepository(async () => {
        if (await fileExists(SHEETBOOK_DIR)) {
            await gitFetch(SHEETBOOK_DIR);
        } else {
            await gitClone(SHEETBOOK_REPO, SHEETBOOK_DIR);
        }

        await gitResetAndCheckout(SHEETBOOK_DIR, MAIN_BRANCH);

        const existingTunes = await getExistingTunes(SHEETBOOK_DIR);
        lastTuneInfo = {
            existingTunes: ['network', 'breaks', ...existingTunes.filter((t) => !['breaks', 'network', 'dances'].includes(t)).sort(), 'dances'].map((tuneName) => ({
                name: tuneName,
                displayName: { network: 'Network description' }[tuneName] ?? tuneName.split('-').map(upperFirst).join(' ')
            })),
            tuneSets: Object.fromEntries(Object.values(TuneSet).map((set) => [set, [...resolveTuneSet(set, existingTunes)]])) as Record<TuneSet, string[]>
        };
        lastPull = Date.now();
    }, 0);
}

export async function getTunesInfo(): Promise<TunesInfo> {
    await pull();
    return lastTuneInfo!;
}