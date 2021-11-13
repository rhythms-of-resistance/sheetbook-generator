import { $ } from "zx";

/**
 * Returns the short commit ID of the current HEAD in the given working copy of a git repository.
 * @param dir The directory path to the working copy.
 */
export async function getCommitId(dir: string): Promise<string> {
    const result = await $`git -C ${dir} log --pretty=format:'%h' -n 1`;
    return result.stdout;
}