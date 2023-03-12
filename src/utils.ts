export const MODEL_NAMES = ["text-embedding-ada-002", "text-ada-001"] as const;
export type ModelName = typeof MODEL_NAMES[number];
export function isModelName(model: string): model is ModelName {
  return MODEL_NAMES.includes(model as ModelName);
}

export const MODEL_COSTS_PER_1K_TOKENS = {
  "text-embedding-ada-002": 0.0004,
  "text-ada-001": 0.0004,
} as const;

export type Embedding = number[] | Float32Array;

export function cost(model: ModelName, tokens: number): number {
  return MODEL_COSTS_PER_1K_TOKENS[model] * Math.ceil(tokens / 1000);
}

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
    (promise, item, index) => promise.then(() => fn(item, index, array)),
    Promise.resolve()
  );
}

export function notNull<T>(value: T | null): value is T {
  return value !== null;
}
