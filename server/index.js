import express from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { getConfig, setConfig, checkClaudeCode } from "./config.js";
import { listChromeProfiles, getChromeTree, bookmarksFromChrome, parseNetscapeHtml } from "./bookmarks.js";
import { categorize } from "./categorize.js";
import { toNetscapeHtml } from "./exportHtml.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const jobs = new Map();

app.get("/api/status", async (_req, res) => {
  const claudeCode = await checkClaudeCode();
  const config = await getConfig();
  res.json({ claudeCode, model: config.model });
});

app.get("/api/config", async (_req, res) => {
  res.json(await getConfig());
});

app.post("/api/config", async (req, res) => {
  res.json(await setConfig(req.body || {}));
});

app.get("/api/chrome-profiles", async (_req, res) => {
  const profiles = await listChromeProfiles();
  res.json({ profiles });
});

app.get("/api/chrome-tree/:profileId", async (req, res) => {
  try {
    const tree = await getChromeTree(req.params.profileId);
    res.json(tree);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post("/api/load", upload.single("file"), async (req, res) => {
  try {
    if (req.file) {
      const bookmarks = parseNetscapeHtml(req.file.buffer);
      return res.json({ bookmarks, source: req.file.originalname });
    }
    const { profileId, folderIds } = req.body || {};
    if (!profileId) return res.status(400).json({ error: "profileId or file required" });
    const bookmarks = await bookmarksFromChrome(profileId, folderIds);
    const profiles = await listChromeProfiles();
    const profile = profiles.find((p) => p.id === profileId);
    res.json({ bookmarks, source: `Chrome · ${profile?.name || profileId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categorize", async (req, res) => {
  const { bookmarks } = req.body || {};
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return res.status(400).json({ error: "bookmarks array required" });
  }
  const { model } = await getConfig();
  const jobId = randomUUID();
  const job = { id: jobId, status: "running", progress: { phase: "starting", done: 0, total: bookmarks.length }, listeners: new Set(), result: null, error: null };
  jobs.set(jobId, job);

  const broadcast = (event) => {
    job.progress = event;
    for (const send of job.listeners) send(event);
  };

  (async () => {
    try {
      const result = await categorize(bookmarks, model, broadcast);
      job.result = result;
      job.status = "complete";
      for (const send of job.listeners) send({ phase: "complete", done: bookmarks.length, total: bookmarks.length });
    } catch (err) {
      job.status = "error";
      job.error = err.message;
      for (const send of job.listeners) send({ phase: "error", error: err.message });
    }
  })();

  res.json({ jobId });
});

app.get("/api/categorize/:jobId/events", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).end();

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.phase === "complete" || event.phase === "error") {
      res.end();
    }
  };

  job.listeners.add(send);
  send(job.progress);
  if (job.status === "complete") send({ phase: "complete", done: job.progress.total, total: job.progress.total });
  if (job.status === "error") send({ phase: "error", error: job.error });

  req.on("close", () => job.listeners.delete(send));
});

app.get("/api/categorize/:jobId/result", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "job not found" });
  if (job.status === "error") return res.status(500).json({ error: job.error });
  if (job.status !== "complete") return res.status(409).json({ error: "not ready" });
  res.json(job.result);
});

app.post("/api/export", (req, res) => {
  const { categories, title } = req.body || {};
  if (!Array.isArray(categories)) return res.status(400).json({ error: "categories required" });
  const html = toNetscapeHtml({ categories, title });
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Content-Disposition", 'attachment; filename="AutoCat-bookmarks.html"');
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`AutoCat running at http://localhost:${PORT}`);
});
