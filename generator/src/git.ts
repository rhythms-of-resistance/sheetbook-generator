import { $ } from "zx";

/**
 * Returns the short commit ID of the current HEAD in the given working copy of a git repository.
 * @param dir The directory path to the working copy.
 */
export async function getCommitId(dir: string): Promise<string> {
    const result = await $`git -C ${dir} log --pretty=format:'%h' -n 1`;
    return result.stdout;
}

/**
 * Clones the given git repository into the given directory.
 * @param repoUrl The URL of the git repository
 * @param dir The directory to be created for the clone
 */
export async function gitClone(repoUrl: string, dir: string, { bare, noCheckout }: { bare?: boolean; noCheckout?: boolean } = { }): Promise<void> {
    await $`git clone ${bare ? '--bare' : []} ${noCheckout ? '--no-checkout' : []} ${repoUrl} ${dir}`;
}

/**
 * Fetches any updates from the repository.
 * @param dir The directory of the working copy
 */
export async function gitFetch(dir: string): Promise<void> {
    await $`git -C ${dir} fetch`;
}

/**
 * Checks out the given commit/branch/tag.
 * @param dir The directory of the working copy
 * @param treeish The commit/branch/tag ID to check out
 */
export async function gitCheckout(dir: string, treeish: string): Promise<void> {
    await $`git -C ${dir} checkout ${treeish}`;
}

/**
 * Lists the files in a git repository.
 * @param dir The directory of the git repository
 * @param treeish The commit/branch/tag ID
 */
export async function gitLsTree(dir: string, treeish: string, { nameOnly }: {nameOnly?: boolean } = { }): Promise<string[]> {
    const result = await $`git -C ${dir} ls-tree ${nameOnly ? '--name-only' : []} ${treeish}`;
    return result.stdout.split('\n');
}