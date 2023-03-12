import express from "express";
import { z } from "zod";
import { complete, embed } from "./openai";
import { isCompletionModelName, isEmbeddingModelName } from "./utils";

export function makeServer(): express.Express {
  const app = express();

  app.get("/ping", (req, res) => {
    res.send("pong");
  });

  const maxTokensSchema = z.number().positive().int();
  const temperatureSchema = z.number().positive().gte(0).lte(2);
  const logprobsSchema = z.number().positive().int().lte(5);
  const completeSchema = z.object({
    model: z.string().refine(isCompletionModelName),
    prompt: z.string().nonempty(),
    maxTokens: z
      .string()
      .optional()
      .transform((s) => {
        if (s == null) {
          return undefined;
        }
        return maxTokensSchema.parse(parseInt(s));
      }),
    temperature: z
      .string()
      .optional()
      .transform((s) => {
        if (s == null) {
          return undefined;
        }
        return temperatureSchema.parse(parseFloat(s));
      }),
    logprobs: z
      .string()
      .optional()
      .transform((s) => {
        if (s == null) {
          return undefined;
        }
        return logprobsSchema.parse(parseInt(s));
      }),
  });
  app.get("/complete", async (req, res, next) => {
    try {
      const { model, prompt, maxTokens, temperature, logprobs } =
        completeSchema.parse(req.query);

      const completion = await complete(model, prompt, {
        maxTokens,
        temperature,
        logprobs,
      });

      res.send(completion);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).send(err.message);
      } else {
        next(err);
      }
    }
  });

  const embedSchema = z.object({
    model: z.string().refine(isEmbeddingModelName),
    texts: z
      .string()
      .nonempty()
      .transform((s) => JSON.parse(s))
      .refine((a) => Array.isArray(a) && a.every((s) => typeof s === "string")),
  });
  app.get("/embed", async (req, res, next) => {
    try {
      const { model, texts } = embedSchema.parse(req.query);
      const embeddings = await embed(model, texts);
      res.send(embeddings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).send(err.message);
      } else {
        next(err);
      }
    }
  });

  // on error, return 500
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).send(err.message);
  });

  return app;
}
