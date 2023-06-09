import Database, { Database as IDatabase } from "better-sqlite3";
import { config } from "./config";
import md5 from "md5";
import {
  embeddingFromBuffer,
  embeddingToBuffer,
  ModelName,
  Embedding,
  cost,
  EmbeddingModelName,
} from "./utils";

const SCHEMA = `
-- a log of all our requests, mainly used for cost tracking purposes
CREATE TABLE IF NOT EXISTS "log" (
  "uuid" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "request_type" TEXT NOT NULL,
  "tokens" INTEGER NOT NULL,
  "model" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,

  PRIMARY KEY("uuid")
);
CREATE INDEX IF NOT EXISTS "log_time" ON "log" ("created_at");
CREATE INDEX IF NOT EXISTS "log_request_type" ON "log" ("request_type");
CREATE INDEX IF NOT EXISTS "log_model" ON "log" ("model");

-- a cache of requests. if some requests are batch requests, they may have their own table
CREATE TABLE IF NOT EXISTS "request" (
  -- using a uuid as our primary key allows us to have multiple requests with the same hash
  -- this way, even if we decide to bypass the cache, we still save all the requests we make
  "uuid" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "request_hash" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "request_type" TEXT NOT NULL,
  "request_json" TEXT NOT NULL,
  "response_json" TEXT NOT NULL,
  
  "tokens" INTEGER NULL,
  "model" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,
  
  PRIMARY KEY("uuid")
);
CREATE INDEX IF NOT EXISTS "request_request_hash" ON "request" ("request_hash");
CREATE INDEX IF NOT EXISTS "request_time" ON "request" ("created_at");
CREATE INDEX IF NOT EXISTS "request_request_type" ON "request" ("request_type");
CREATE INDEX IF NOT EXISTS "request_model" ON "request" ("model");
CREATE INDEX IF NOT EXISTS "request_most_recent_match" ON "request" ("request_hash", "created_at" DESC);
  
CREATE TABLE IF NOT EXISTS "embedding" (
  -- using a uuid as our primary key allows us to have multiple embeddings with the same hash
  -- this way, even if we decide to bypass the cache, we still save all the embeddings we make
  "uuid" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "text_hash" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "text" TEXT NOT NULL,
  -- embeddings are arrays of floats
  "embedding" BLOB NOT NULL,

  PRIMARY KEY("uuid")
);
CREATE INDEX IF NOT EXISTS "embedding_time" ON "embedding" ("created_at");
CREATE INDEX IF NOT EXISTS "embedding_model" ON "embedding" ("model");
CREATE INDEX IF NOT EXISTS "embedding_most_recent_match" ON "embedding" ("text_hash", "model", "created_at" DESC);

`;

let CONNECTION: IDatabase | null = null;
export async function ensureDB() {
  if (CONNECTION == null) {
    CONNECTION = new Database(config.dbFile);
    CONNECTION.pragma("journal_mode = WAL");
    await migrate(CONNECTION);
  }
  return CONNECTION;
}

async function migrate(db: IDatabase) {
  await db.exec(SCHEMA);
}

// #region request

export interface DBRequestRow {
  request_hash: string;
  created_at: string;

  request_type: "completion" | "embedding";
  request_json: string;
  response_json: string;

  tokens: number | null;
  model: string;
  cost: number;
}

interface Request {
  model: ModelName;
}

interface Response {
  usage?: {
    total_tokens: number;
  };
}

function hash(request: Request): string {
  return md5(JSON.stringify(request));
}

export async function addRequestToCache(
  type: DBRequestRow["request_type"],
  request: Request,
  response: Response
): Promise<void> {
  const db = await ensureDB();

  const request_json = JSON.stringify(request);
  const row: Omit<DBRequestRow, "created_at"> = {
    request_hash: hash(request),

    request_type: type,
    request_json,
    response_json: JSON.stringify(response),

    tokens: response.usage?.total_tokens ?? null,
    model: request.model,
    cost: cost(request.model, response.usage?.total_tokens ?? 0),
  };

  const stmt = db.prepare(`
        INSERT INTO "request" (
            "request_hash",
            "request_type",
            "request_json",
            "response_json",
            "tokens",
            "model",
            "cost"
        ) VALUES (
            @request_hash,
            @request_type,
            @request_json,
            @response_json,
            @tokens,
            @model,
            @cost
        )
    `);
  const result = stmt.run(row);

  if (result.changes !== 1) {
    throw new Error(`Failed to create request row`);
  }
}

export async function getRequestFromCache(
  request: Request
): Promise<DBRequestRow | null> {
  const db = await ensureDB();

  const stmt = db.prepare<{ request_hash: string }>(`
        SELECT * FROM "request"
        WHERE "request_hash" = @request_hash
        ORDER BY "created_at" DESC
        LIMIT 1
    `);
  const row: DBRequestRow = stmt.get({ request_hash: hash(request) });

  if (row == null) {
    return null;
  }

  return row;
}

// #endregion request

// #region embedding

export interface DBEmbeddingRow {
  text_hash: string;
  model: EmbeddingModelName;
  created_at: string;

  text: string;
  embedding: Buffer;
}

export async function addEmbeddingToCache(
  text: string,
  model: EmbeddingModelName,
  embedding: Embedding
): Promise<void> {
  const db = await ensureDB();

  const row: Omit<DBEmbeddingRow, "created_at"> = {
    text_hash: md5(text),
    model,
    text,
    embedding: embeddingToBuffer(embedding),
  };

  const stmt = db.prepare(`
        INSERT INTO "embedding" (
            "text_hash",
            "model",
            "text",
            "embedding"
        ) VALUES (
            @text_hash,
            @model,
            @text,
            @embedding
        )
    `);
  const result = stmt.run(row);

  if (result.changes !== 1) {
    throw new Error(`Failed to create embedding row`);
  }
}

export async function getEmbeddingFromCache(
  text: string,
  model: EmbeddingModelName
): Promise<
  (Omit<DBEmbeddingRow, "embedding"> & { embedding: Embedding }) | null
> {
  const db = await ensureDB();

  const stmt = db.prepare<{ text_hash: string; model: string }>(`
        SELECT * FROM "embedding"
        WHERE "text_hash" = @text_hash AND "model" = @model
        ORDER BY "created_at" DESC
        LIMIT 1
    `);
  const rows = stmt.all({ text_hash: md5(text), model });

  if (rows.length < 1) {
    return null;
  }

  return {
    text_hash: rows[0].text_hash,
    model: rows[0].model,
    created_at: rows[0].created_at,

    text: rows[0].text,
    embedding: embeddingFromBuffer(rows[0].embedding),
  };
}

// #endregion embedding

// #region log

export interface DBLogRow {
  created_at: string;
  request_type: "completion" | "embedding";
  model: ModelName;

  tokens: number;
  cost: number;
}

export async function addLogEntry(
  type: DBLogRow["request_type"],
  model: ModelName,
  tokens: number
) {
  const db = await ensureDB();

  const row: Omit<DBLogRow, "created_at"> = {
    request_type: type,
    model,
    tokens,
    cost: cost(model, tokens),
  };

  const stmt = db.prepare(`
        INSERT INTO "log" (
            "request_type",
            "model",
            "tokens",
            "cost"
        ) VALUES (
            @request_type,
            @model,
            @tokens,
            @cost
        )
    `);
  const result = stmt.run(row);

  if (result.changes !== 1) {
    throw new Error(`Failed to create log entry`);
  }
}

// #endregion log