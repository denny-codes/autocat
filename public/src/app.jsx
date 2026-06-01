/* AutoCat — app shell: routing, state, theme, moves, real export. */

const FONT_STACKS = {
  Geist: '"Geist", ui-sans-serif, system-ui, sans-serif',
  "system-ui": 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  Inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
};

function useWindowWidth() {
  const [w, setW] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  React.useEffect(() => {
    const on = () => setW(window.innerWidth);
    on();
    window.addEventListener("resize", on);
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(on);
      ro.observe(document.documentElement);
    }
    return () => { window.removeEventListener("resize", on); if (ro) ro.disconnect(); };
  }, []);
  return w;
}

function useRoute() {
  const [route, setRoute] = React.useState(() => location.hash || "#/setup");
  React.useEffect(() => {
    const on = () => setRoute(location.hash || "#/setup");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const clone = (d) => JSON.parse(JSON.stringify(d));
const PALETTE_KEY = "meadow";

function useTheme() {
  const initial = (() => {
    try {
      const saved = localStorage.getItem("autocat:theme");
      if (saved) return saved;
    } catch { /* ignore */ }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  })();
  const [theme, setTheme] = React.useState(initial);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("autocat:theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme];
}

function App() {
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  const [data, setData] = React.useState(null); // { source, categories }
  const [bookmarks, setBookmarks] = React.useState(null); // pre-categorize buffer
  const [jobId, setJobId] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);
  const [exportInfo, setExportInfo] = React.useState(null);
  const route = useRoute();
  const winW = useWindowWidth();
  const undoRef = React.useRef(null);
  const toastTimer = React.useRef(null);

  // baseline tokens (no tweak panel; matches the design defaults)
  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--font-sans", FONT_STACKS.Geist);
    r.style.setProperty("--r-card", "16px");
    r.setAttribute("data-shadow", "soft");
    r.style.setProperty("--logo-acc", accentFor(PALETTE_KEY, 0, dark));
  }, [dark]);

  const nav = (hash) => { location.hash = hash; };

  const showToast = (toastObj) => {
    setToast(toastObj);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), toastObj.sticky ? 8000 : 4500);
  };

  // ── ingest bookmarks and start categorization ──
  const startCategorize = async (loaded) => {
    setBookmarks(loaded.bookmarks);
    setData({ source: loaded.source, categories: [] });
    try {
      const { jobId } = await api.startCategorize(loaded.bookmarks);
      setJobId(jobId);
      nav("#/categorizing");
    } catch (err) {
      showToast({ msg: `Couldn't start: ${err.message}`, error: true });
    }
  };

  const onCategorizeComplete = (result) => {
    // attach normalized id per bookmark already present
    setData((d) => ({ source: d?.source || "Bookmarks", categories: result.categories }));
    setJobId(null);
    nav("#/home");
  };

  const onCategorizeError = (msg) => {
    showToast({ msg: `Categorization failed: ${msg}`, error: true, sticky: true });
    nav("#/source");
  };

  // ── move bookmark (optimistic) ──
  const moveBookmark = (bmId, toId) => {
    if (!data) return;
    const before = clone(data);
    const next = clone(data);
    let bm = null;
    for (const c of next.categories) {
      const idx = c.bookmarks.findIndex((b) => b.id === bmId);
      if (idx >= 0) { bm = c.bookmarks.splice(idx, 1)[0]; break; }
    }
    if (!bm) return;
    const toCat = next.categories.find((c) => c.id === toId);
    if (!toCat) return;
    toCat.bookmarks.push(bm);
    setData(next);

    undoRef.current = before;
    showToast({
      msg: `Moved to ${toCat.name}`,
      undo: () => { if (undoRef.current) { setData(undoRef.current); setToast(null); } },
    });
  };

  const editName = (catId, name) =>
    setData((d) => { const n = clone(d); const c = n.categories.find((x) => x.id === catId); if (c) c.name = name; return n; });
  const editSummary = (catId, s) =>
    setData((d) => { const n = clone(d); const c = n.categories.find((x) => x.id === catId); if (c) c.summary = s; return n; });
  const deleteCategory = (catId) => {
    setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== catId) }));
    nav("#/home");
    showToast({ msg: "Category deleted" });
  };

  const onExport = () => {
    if (!data) return;
    setExportInfo({ total: data.categories.reduce((n, c) => n + c.bookmarks.length, 0), nCats: data.categories.length });
    setExporting(true);
  };

  const doDownload = async () => {
    if (!data) return;
    const res = await fetch(api.exportUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categories: data.categories, title: data.source || "AutoCat Bookmarks" }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "AutoCat-bookmarks.html";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const onRecategorize = async () => {
    if (!bookmarks || bookmarks.length === 0) {
      nav("#/source");
      return;
    }
    try {
      const { jobId } = await api.startCategorize(bookmarks);
      setJobId(jobId);
      nav("#/categorizing");
    } catch (err) {
      showToast({ msg: `Couldn't start: ${err.message}`, error: true });
    }
  };

  // ── routing ──
  let view;
  if (route.startsWith("#/category/")) {
    const id = route.split("/")[2];
    const index = data ? data.categories.findIndex((c) => c.id === id) : -1;
    const category = data && data.categories[index];
    if (!category) view = <Redirect to="#/home" />;
    else view = (
      <CategoryDetail
        data={data} category={category} index={index}
        palette={PALETTE_KEY} dark={dark}
        onBack={() => nav("#/home")}
        onMove={moveBookmark}
        onEditName={(name) => editName(id, name)}
        onEditSummary={(s) => editSummary(id, s)}
        onDelete={() => deleteCategory(id)}
      />
    );
  } else if (route.startsWith("#/setup")) {
    view = <SetupScreen nav={nav} />;
  } else if (route.startsWith("#/source")) {
    view = <SourceScreen nav={nav}
                         onLoaded={startCategorize}
                         onError={(msg) => showToast({ msg, error: true })} />;
  } else if (route.startsWith("#/categorizing")) {
    const total = bookmarks ? bookmarks.length : 0;
    view = <CategorizingScreen jobId={jobId} total={total}
                               onComplete={onCategorizeComplete}
                               onError={onCategorizeError} />;
  } else {
    if (!data || data.categories.length === 0) {
      view = <Redirect to={data ? "#/source" : "#/setup"} />;
    } else {
      const autoCols = winW >= 1280 ? 4 : winW >= 960 ? 3 : winW >= 640 ? 2 : 1;
      view = (
        <HomeScreen
          data={data} dark={dark} palette={PALETTE_KEY} treatment="cascade"
          columns={autoCols}
          onToggleTheme={() => setTheme(dark ? "light" : "dark")}
          nav={nav} onExport={onExport} onRecategorize={onRecategorize}
        />
      );
    }
  }

  return (
    <>
      {view}
      <Toast toast={toast} onUndo={() => toast && toast.undo && toast.undo()} onDismiss={() => setToast(null)} />
      {exporting && exportInfo && (
        <ExportModal total={exportInfo.total} nCats={exportInfo.nCats}
                     onClose={() => setExporting(false)} onDownload={doDownload} />
      )}
    </>
  );
}

function Redirect({ to }) {
  React.useEffect(() => { location.hash = to; }, [to]);
  return null;
}

function ExportModal({ total, nCats, onClose, onDownload }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Export bookmarks">
        <span className="export-check"><I.check size={26} /></span>
        <h2>Ready to download</h2>
        <p><b>{total}</b> bookmarks across <b>{nCats}</b> categories, ready to re-import into Chrome.</p>
        <div className="export-file">
          <I.upload size={16} /> AutoCat-bookmarks.html
        </div>
        <div className="export-foot">
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          <PrimaryButton onClick={onDownload} icon={<I.arrowR size={16} />}>Download</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
