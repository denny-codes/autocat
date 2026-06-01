import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";

const execFileP = promisify(execFile);

const DIR = path.join(os.homedir(), ".autocat");
const FILE = path.join(DIR, "config.json");

const DEFAULTS = {
  model: "claude-haiku-4-5-20251001",
  lastProfile: null,
};

async function ensureDir() {
  await fs.mkdir(DIR, { recursive: true, mode: 0o700 });
}

export async function getConfig() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setConfig(patch) {
  await ensureDir();
  const current = await getConfig();
  const next = { ...current, ...patch };
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

export async function checkClaudeCode() {
  try {
    const { stdout } = await execFileP("claude", ["--version"], { timeout: 5000 });
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    const version = match ? match[1] : stdout.trim();
    return { installed: true, version };
  } catch (err) {
    return { installed: false, version: null, error: err.code === "ENOENT" ? "not found" : err.message };
  }
}
