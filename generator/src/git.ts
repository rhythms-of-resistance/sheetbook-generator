import { $ } from "zx";

export async function getCommitId(dir: string): Promise<string> {
    const result = await $`git -C ${dir} log --pretty=format:'%h' -n 1`;
    return result.stdout;
}