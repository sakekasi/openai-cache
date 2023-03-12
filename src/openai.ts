import {
  Configuration,
  OpenAIApi,
  CreateCompletionRequest,
  CreateCompletionResponse,
} from "openai";
import { config } from "./config";
import {
    addEmbeddingToCache,
  addLogEntry,
  addRequestToCache,
  getEmbeddingFromCache,
  getRequestFromCache,
} from "./db";
import { asyncForEachParallel, asyncMap, CompletionModelName, EmbeddingModelName, ModelName, notNull } from "./utils";

const configuration = new Configuration({
  apiKey: config.openaiApiKey,
});
export const openai = new OpenAIApi(configuration);

interface MyCreateCompletionRequest extends CreateCompletionRequest {
  model: ModelName;
}

export async function complete(
  model: CompletionModelName,
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
  if (response.data.usage?.total_tokens != null) {
    addLogEntry('completion', model, response.data.usage?.total_tokens);
  }

  return response.data;
}

// createEmbedding
// https://platform.openai.com/docs/api-reference/embeddings
export async function embed(model: EmbeddingModelName, texts: string[]) {
  const cachedEmbeddings = (
    await asyncMap(texts, (text) => getEmbeddingFromCache(text, model))
  ).filter(notNull);

  const uncachedEmbeddings = texts.filter(
    (text) => !cachedEmbeddings.some((e) => e.text === text)
  );

  if (uncachedEmbeddings.length === 0) {
    return cachedEmbeddings;
  }

  const response = await openai.createEmbedding({
    model,
    input: uncachedEmbeddings,
  });

  if (response.status !== 200) {
    throw new Error(`Failed to create embedding: ${response.statusText}`);
  }

  const embeddings = response.data.data.map(({ embedding, index }) => ({
    text: uncachedEmbeddings[index],
    embedding,
  }));

  await asyncForEachParallel(embeddings, ({ text, embedding }) =>
    addEmbeddingToCache(text, model, embedding)
  );
  if (response.data.usage?.total_tokens != null) {
    addLogEntry('embedding', model, response.data.usage?.total_tokens);
  }

  return [...cachedEmbeddings, ...embeddings];
}
