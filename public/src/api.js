/* AutoCat — tiny REST client. Exposed as window.api. */

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

window.api = {
  status: () => jsonFetch("/api/status"),
  getConfig: () => jsonFetch("/api/config"),
  setConfig: (patch) => jsonFetch("/api/config", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
  }),
  chromeProfiles: () => jsonFetch("/api/chrome-profiles"),
  chromeTree: (profileId) => jsonFetch(`/api/chrome-tree/${encodeURIComponent(profileId)}`),
  loadChrome: (profileId, folderIds) => jsonFetch("/api/load", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId, folderIds }),
  }),
  loadFile: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return jsonFetch("/api/load", { method: "POST", body: fd });
  },
  startCategorize: (bookmarks) => jsonFetch("/api/categorize", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bookmarks }),
  }),
  categorizeResult: (jobId) => jsonFetch(`/api/categorize/${jobId}/result`),
  categorizeEvents: (jobId, onEvent) => {
    const es = new EventSource(`/api/categorize/${jobId}/events`);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* ignore parse errors */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  },
  exportUrl: () => "/api/export",
};
