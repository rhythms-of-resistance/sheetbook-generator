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
export async function gitClone(repoUrl: string, dir: string): Promise<void> {
    await $`git clone ${repoUrl} ${dir}`;
}

/**
 * Fetches any updates from the repository.
 * @param dir The directory of the working copy
 */
export async function gitFetch(dir: string): Promise<void> {
    await $`git -C ${dir} fetch`;
}

/**
 * Checks out the given commit/branch/tag, discarding any local changes.
 * @param dir The directory of the working copy
 * @param commitId The commit/branch/tag ID to reset to
 */
export async function gitResetAndCheckout(dir: string, commitId: string): Promise<void> {
    await $`git -C ${dir} reset --hard`;
    await $`git -C ${dir} checkout ${commitId}`;
}