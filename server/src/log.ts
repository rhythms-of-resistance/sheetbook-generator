// Override console.log to capture zx output
const consoleLog = console.log;
console.log = function(...args) {
    const customLog = (process as any).domain?.rsgLog;
    if (customLog) {
        customLog(`${args.join(' ')}\n`);
    } else {
        consoleLog(...args);
    }
};

const stdoutWrite = process.stdout.write;
process.stdout.write = function(...args): boolean {
    const customLog = (process as any).domain?.rsgLog;
    if (customLog) {
        customLog(String(args[0]));
        return true;
    } else {
        return stdoutWrite.apply(this, args as any);
    }
};

const stderrWrite = process.stderr.write;
process.stderr.write = function(...args): boolean {
    const customLog = (process as any).domain?.rsgLog;
    if (customLog) {
        customLog(String(args[0]));
        return true;
    } else {
        return stderrWrite.apply(this, args as any);
    }
};

export function setCustomLogForCurrentRequest(log: (chunk: string) => void): void {
	(process as any).domain.rsgLog = log;
}