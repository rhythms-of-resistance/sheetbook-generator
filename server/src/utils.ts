import { promises as fs } from 'fs';

export async function fileExists(filename: string): Promise<boolean> {
    try {
        await fs.stat(filename);
        return true;
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return false;
        } else {
            throw err;
        }
    }
}