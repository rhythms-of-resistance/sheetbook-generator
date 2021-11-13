import { alignTunes } from '../generate';

test('alignTunes', () => {
    const pageNumbers = new Map<string, number>(Object.entries({
        a: 1,
        b: 1,
        c: 2, // Not moved
        d: 1,
        e: 2, // Moved up
        f: 2, // Moved up
        g: 2, // Moved down
        h: 1,
        i: 1,
        j: 2 // Moved up
    }));

    expect(alignTunes(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], pageNumbers))
        .toEqual(['a', 'b', 'c', 'e', 'f', 'd', 'h', 'g', 'j', 'i']);
});