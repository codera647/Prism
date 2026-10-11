-- Shared metadata only. Original images belong in the private R2 binding.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, google_sub TEXT UNIQUE NOT NULL, email TEXT NOT NULL,
 name TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS oauth_states (
 state_hash TEXT PRIMARY KEY, nonce TEXT NOT NULL, verifier TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
 id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS campaigns_owner_updated ON campaigns(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS saved_ideas (
 id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 campaign_id TEXT NOT NULL, title TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,id),
 FOREIGN KEY(user_id,campaign_id) REFERENCES campaigns(user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ideas_owner_campaign ON saved_ideas(user_id,campaign_id);
CREATE TABLE IF NOT EXISTS provider_keys (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL,
 encrypted TEXT NOT NULL, model TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,provider)
);
CREATE TABLE IF NOT EXISTS usage_buckets (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL,
 PRIMARY KEY(user_id,kind,bucket)
);
CREATE TABLE IF NOT EXISTS design_jobs (
 id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 campaign_id TEXT NOT NULL, request_key TEXT NOT NULL, prompt TEXT NOT NULL,
 model TEXT NOT NULL, status TEXT NOT NULL, provider_id TEXT,
 results TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,id), UNIQUE(user_id,request_key),
 FOREIGN KEY(user_id,campaign_id) REFERENCES campaigns(user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS jobs_owner_campaign ON design_jobs(user_id,campaign_id,created_at DESC);
CREATE TABLE IF NOT EXISTS media (
 id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 campaign_id TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
 bytes INTEGER NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,id),
 FOREIGN KEY(user_id,campaign_id) REFERENCES campaigns(user_id,id) ON DELETE CASCADE
);
