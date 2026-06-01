import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import * as cheerio from "cheerio";

const CHROME_DIRS = {
  darwin: path.join(os.homedir(), "Library/Application Support/Google/Chrome"),
  linux: path.join(os.homedir(), ".config/google-chrome"),
  win32: path.join(os.homedir(), "AppData/Local/Google/Chrome/User Data"),
};

function chromeDir() {
  return CHROME_DIRS[process.platform] || CHROME_DIRS.linux;
}

function bookmarkId(url, title) {
  return crypto.createHash("sha1").update(`${url}\n${title}`).digest("hex").slice(0, 12);
}

export async function listChromeProfiles() {
  const root = chromeDir();
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const profiles = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name !== "Default" && !entry.name.startsWith("Profile")) continue;
    const bookmarksPath = path.join(root, entry.name, "Bookmarks");
    try {
      await fs.access(bookmarksPath);
    } catch {
      continue;
    }
    let displayName = entry.name;
    try {
      const prefs = JSON.parse(await fs.readFile(path.join(root, entry.name, "Preferences"), "utf8"));
      if (prefs?.profile?.name) displayName = prefs.profile.name;
    } catch {
      // fall back to dir name
    }
    profiles.push({ id: entry.name, name: displayName, path: bookmarksPath });
  }
  return profiles;
}

function walkChromeNode(node, folderPath, out) {
  if (!node) return;
  if (node.type === "url") {
    out.push({
      id: bookmarkId(node.url, node.name),
      title: node.name || node.url,
      url: node.url,
      folder: folderPath.join(" / "),
    });
    return;
  }
  if (node.type === "folder" && Array.isArray(node.children)) {
    const nextPath = node.name ? [...folderPath, node.name] : folderPath;
    for (const child of node.children) walkChromeNode(child, nextPath, out);
  }
}

function folderTree(node, depth = 0) {
  if (!node || node.type !== "folder") return null;
  const children = (node.children || []).filter((c) => c.type === "folder").map((c) => folderTree(c, depth + 1)).filter(Boolean);
  const directCount = (node.children || []).filter((c) => c.type === "url").length;
  const totalCount = countBookmarks(node);
  return { id: node.id || node.guid || node.name, name: node.name, depth, directCount, totalCount, children };
}

function countBookmarks(node) {
  if (!node) return 0;
  if (node.type === "url") return 1;
  if (Array.isArray(node.children)) return node.children.reduce((n, c) => n + countBookmarks(c), 0);
  return 0;
}

export async function loadChromeProfile(profileId) {
  const profiles = await listChromeProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error(`Chrome profile not found: ${profileId}`);
  const raw = JSON.parse(await fs.readFile(profile.path, "utf8"));
  const roots = raw.roots || {};
  const rootList = ["bookmark_bar", "other", "synced"]
    .filter((k) => roots[k])
    .map((k) => ({ ...roots[k], name: roots[k].name || k }));
  return { profile, roots: rootList };
}

export async function getChromeTree(profileId) {
  const { profile, roots } = await loadChromeProfile(profileId);
  return {
    profile,
    folders: roots.map((root) => folderTree(root)).filter(Boolean),
  };
}

export async function bookmarksFromChrome(profileId, folderIds) {
  const { roots } = await loadChromeProfile(profileId);
  const wanted = new Set(folderIds || []);
  const out = [];

  const visit = (node, ancestors, included) => {
    if (!node) return;
    if (node.type === "url") {
      if (included) {
        out.push({
          id: bookmarkId(node.url, node.name),
          title: node.name || node.url,
          url: node.url,
          folder: ancestors.join(" / "),
        });
      }
      return;
    }
    if (node.type === "folder") {
      const nodeId = node.id || node.guid || node.name;
      const nowIncluded = included || wanted.has(nodeId) || wanted.size === 0;
      const nextAncestors = node.name ? [...ancestors, node.name] : ancestors;
      for (const child of node.children || []) visit(child, nextAncestors, nowIncluded);
    }
  };

  for (const root of roots) visit(root, [], wanted.size === 0);
  return dedupeById(out);
}

export function parseNetscapeHtml(buffer) {
  const html = Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer);
  const $ = cheerio.load(html);
  const out = [];

  const walk = (el, folderPath) => {
    const $el = $(el);
    $el.children().each((_, child) => {
      if (child.name === "dt") {
        const h3 = $(child).children("h3").first();
        const a = $(child).children("a").first();
        if (h3.length) {
          const name = h3.text().trim();
          const dl = $(child).children("dl").first();
          if (dl.length) walk(dl[0], [...folderPath, name]);
        } else if (a.length) {
          const url = a.attr("href");
          const title = a.text().trim();
          if (url) {
            out.push({
              id: bookmarkId(url, title),
              title: title || url,
              url,
              folder: folderPath.join(" / "),
            });
          }
        }
      } else if (child.name === "dl") {
        walk(child, folderPath);
      }
    });
  };

  $("dl").first().each((_, dl) => walk(dl, []));
  return dedupeById(out);
}

function dedupeById(list) {
  const seen = new Set();
  return list.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}
