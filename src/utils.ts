export const EMBEDDING_MODEL_NAMES = [
  "text-embedding-ada-002",
  "text-embedding-babbage-001",
  "text-embedding-curie-001",
  "text-embedding-davinci-001",
] as const;
export type EmbeddingModelName = typeof EMBEDDING_MODEL_NAMES[number];
export function isEmbeddingModelName(
  model: string
): model is EmbeddingModelName {
  return EMBEDDING_MODEL_NAMES.includes(model as EmbeddingModelName);
}

export const COMPLETION_MODEL_NAMES = [
  "text-ada-001",
  "text-babbage-001",
  "text-curie-001",
  "text-davinci-001",
] as const;
export type CompletionModelName = typeof COMPLETION_MODEL_NAMES[number];
export function isCompletionModelName(
  model: string
): model is CompletionModelName {
  return COMPLETION_MODEL_NAMES.includes(model as CompletionModelName);
}

export const MODEL_NAMES = [
  ...EMBEDDING_MODEL_NAMES,
  ...COMPLETION_MODEL_NAMES,
] as const;
export type ModelName = typeof MODEL_NAMES[number];
export function isModelName(model: string): model is ModelName {
  return MODEL_NAMES.includes(model as ModelName);
}

export const MODEL_COSTS_PER_1K_TOKENS = {
  "text-embedding-ada-002": 0.0004,
  "text-ada-001": 0.0004,
  "text-embedding-babbage-001": 0.0005,
  "text-babbage-001": 0.0005,
  "text-embedding-curie-001": 0.002,
  "text-curie-001": 0.002,
  "text-embedding-davinci-001": 0.02,
  "text-davinci-001": 0.02,
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
