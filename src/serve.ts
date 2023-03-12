import express from "express";
import { complete, embed } from "./openai";
import { z } from "zod";
import { isCompletionModelName, isEmbeddingModelName, isModelName } from "./utils";

export function serve(port: number): void {
  const app = express();

  app.get("/ping", (req, res) => {
    res.send("pong");
  });

  const completeSchema = z.object({
    model: z.string().refine(isCompletionModelName),
    prompt: z.string().nonempty(),
    maxTokens: z.number().int().positive().optional(),
    temperature: z.number().positive().gte(0).lte(2).optional(),
    logprobs: z.number().int().positive().lte(5).optional(),
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
    texts: z.string().transform((s) => s.split(",")),
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


  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}
