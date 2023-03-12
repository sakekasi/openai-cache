export const MODEL_NAMES = ['text-embedding-ada-002', 'text-ada-001'] as const;
export type ModelName = typeof MODEL_NAMES[number];
export function isModelName(model: string): model is ModelName {
    return MODEL_NAMES.includes(model as ModelName);
}


export type Embedding = number[] | Float32Array;
