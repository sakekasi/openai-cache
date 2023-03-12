import { Embedding } from "./types";

export function embeddingToBuffer(embedding: Embedding): Buffer {
    return Buffer.from(new Float32Array(embedding).buffer);
}

export function embeddingFromBuffer(buffer: Buffer): Embedding {
    return new Float32Array(buffer.buffer);
}

export function asyncMap<T, U>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<U>
): Promise<U[]> {
    return Promise.all(array.map(fn));
}

export function asyncForEachParallel<T>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<void>
): Promise<void> {
    return Promise.all(array.map(fn)).then(() => {});
}

export function asyncForEachSerial<T>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<void>
): Promise<void> {
    return array.reduce(
        (promise, item, index) =>
            promise.then(() => fn(item, index, array)),
        Promise.resolve()
    );
}

export function notNull<T>(value: T | null): value is T {
    return value !== null;
}