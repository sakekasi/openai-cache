import {
  Configuration,
  OpenAIApi,
  CreateCompletionRequest,
  CreateCompletionResponse,
} from "openai";
import { config } from "./config";
import {
    addEmbeddingToCache,
  addRequestToCache,
  getEmbeddingFromCache,
  getRequestFromCache,
} from "./db";
import { ModelName } from "./types";
import { asyncForEachParallel, asyncMap, notNull } from "./utils";

const configuration = new Configuration({
  apiKey: config.openaiApiKey,
});
export const openai = new OpenAIApi(configuration);

interface MyCreateCompletionRequest extends CreateCompletionRequest {
  model: ModelName;
}

export async function complete(
  model: ModelName,
  prompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    logprobs?: number;
  }
) {
  const request: MyCreateCompletionRequest = {
    model,
    prompt,
  };
  if (options.maxTokens !== undefined) {
    request.max_tokens = options.maxTokens;
  }
  if (options.temperature !== undefined) {
    request.temperature = options.temperature;
  }
  if (options.logprobs !== undefined) {
    request.logprobs = options.logprobs;
  }

  const cached = await getRequestFromCache(request);
  if (cached != null) {
    const response: CreateCompletionResponse = JSON.parse(cached.response_json);
    return response;
  }

  const response = await openai.createCompletion(request);

  if (response.status !== 200) {
    throw new Error(`Failed to create completion: ${response.statusText}`);
  }

  addRequestToCache("completion", request, response.data);

  return response.data;
}

// createEmbedding
// https://platform.openai.com/docs/api-reference/embeddings
export async function embed(model: ModelName, texts: string[]) {
  const cachedEmbeddings = (
    await asyncMap(texts, (text) => getEmbeddingFromCache(text, model))
  ).filter(notNull);

  const uncachedEmbeddings = texts.filter(
    (text) => !cachedEmbeddings.some((e) => e.text === text)
  );

  if (uncachedEmbeddings.length === 0) {
    return cachedEmbeddings;
  }

  const result = await openai.createEmbedding({
    model,
    input: uncachedEmbeddings,
  });

  if (result.status !== 200) {
    throw new Error(`Failed to create embedding: ${result.statusText}`);
  }

  const embeddings = result.data.data.map(({ embedding, index }) => ({
    text: uncachedEmbeddings[index],
    embedding,
  }));

  await asyncForEachParallel(embeddings, ({ text, embedding }) =>
    addEmbeddingToCache(text, model, embedding)
  );

  return [...cachedEmbeddings, ...embeddings];
}
