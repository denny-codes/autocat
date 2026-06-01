/* AutoCat — utility / flow screens: Setup, Source, Categorizing. */

function FlowShell({ children }) {
  return (
    <div className="screen flow-screen">
      <div className="flow-brand">
        <span className="logo-stack sm" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-name">AutoCat</span>
      </div>
      <div className="flow-body">{children}</div>
    </div>
  );
}

// ── Setup ──────────────────────────────────────────────────────────────────
function SetupScreen({ nav }) {
  const [state, setState] = React.useState("checking"); // checking | found | missing
  const [version, setVersion] = React.useState(null);
  const [model, setModel] = React.useState("claude-haiku-4-5-20251001");

  const check = React.useCallback(async () => {
    setState("checking");
    try {
      const { claudeCode, model: m } = await api.status();
      setVersion(claudeCode.version);
      setModel(m);
      setState(claudeCode.installed ? "found" : "missing");
    } catch {
      setState("missing");
    }
  }, []);

  React.useEffect(() => { check(); }, [check]);

  const onModelChange = async (e) => {
    const next = e.target.value;
    setModel(next);
    try { await api.setConfig({ model: next }); } catch { /* surface later via toast */ }
  };

  return (
    <FlowShell>
      <div className="flow-card">
        <div className="flow-card-head">
          <h2>Claude Code</h2>
          <p>AutoCat uses your local Claude Code to invent and assign categories.</p>
        </div>

        {state === "found" && (
          <div className="setup-status ok">
            <span className="status-dot ok"><I.check size={14} /></span>
            <div>
              <div className="status-line">Claude Code detected {version && <span className="ver">v{version}</span>}</div>
              <label className="model-row">
                <span>Model</span>
                <select className="field" value={model} onChange={onModelChange}>
                  <option value="claude-opus-4-7">Claude Opus 4.7</option>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                </select>
              </label>
            </div>
          </div>
        )}
        {state === "checking" && (
          <div className="setup-status checking">
            <span className="status-dot spin" aria-hidden="true" />
            <div className="status-line">Checking for Claude Code…</div>
          </div>
        )}
        {state === "missing" && (
          <div className="setup-status miss">
            <span className="status-dot miss"><I.x size={14} /></span>
            <div>
              <div className="status-line">Claude Code not found</div>
              <a className="install-link" href="https://claude.com/claude-code" target="_blank" rel="noreferrer">Install Claude Code →</a>
            </div>
          </div>
        )}

        <div className="flow-card-foot">
          <SecondaryButton onClick={check} disabled={state === "checking"}>Recheck</SecondaryButton>
          <PrimaryButton disabled={state !== "found"} onClick={() => nav("#/source")} icon={<I.arrowR size={16} />}>Continue</PrimaryButton>
        </div>
      </div>
    </FlowShell>
  );
}

// ── Source ─────────────────────────────────────────────────────────────────
function flattenTree(folders, depth = 0, out = []) {
  for (const f of folders) {
    out.push({ id: String(f.id), name: f.name, depth, count: f.totalCount });
    if (f.children && f.children.length) flattenTree(f.children, depth + 1, out);
  }
  return out;
}

function SourceScreen({ nav, onLoaded, onError }) {
  const [mode, setMode] = React.useState("chrome");
  const [profiles, setProfiles] = React.useState([]);
  const [profile, setProfile] = React.useState("");
  const [tree, setTree] = React.useState([]);
  const [picked, setPicked] = React.useState({});
  const [file, setFile] = React.useState(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    api.chromeProfiles().then(({ profiles }) => {
      setProfiles(profiles);
      if (profiles.length) setProfile(profiles[0].id);
      else setMode("file");
    }).catch(() => setMode("file"));
  }, []);

  React.useEffect(() => {
    if (!profile) return;
    api.chromeTree(profile).then(({ folders }) => {
      const flat = flattenTree(folders);
      setTree(flat);
      const initial = {};
      for (const f of flat) initial[f.id] = f.depth === 0;
      setPicked(initial);
    }).catch(() => setTree([]));
  }, [profile]);

  const total = tree.filter((f) => picked[f.id]).reduce((n, f) => n + (f.depth === 0 ? f.count : 0), 0);
  const ready = mode === "chrome" ? total > 0 && !busy : !!file && !busy;

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setMode("file");
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    pickFile(f);
  };

  const submit = async () => {
    setBusy(true);
    try {
      let result;
      if (mode === "file") {
        result = await api.loadFile(file);
      } else {
        const folderIds = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
        result = await api.loadChrome(profile, folderIds);
      }
      if (!result.bookmarks || result.bookmarks.length === 0) {
        onError && onError("That source has no bookmarks.");
        setBusy(false);
        return;
      }
      onLoaded(result);
    } catch (err) {
      onError && onError(err.message);
      setBusy(false);
    }
  };

  return (
    <FlowShell>
      <div className="flow-card wide">
        <div className="flow-card-head">
          <h2>Where are your bookmarks?</h2>
          <p>Pick a Chrome profile and folders, or drop an exported file.</p>
        </div>

        <div className="source-grid">
          <button className={`source-opt ${mode === "chrome" ? "sel" : ""}`}
                  onClick={() => setMode("chrome")} disabled={profiles.length === 0}>
            <div className="source-opt-head">
              <I.folder size={17} /><span>Use Chrome bookmarks</span>
            </div>
            {profiles.length === 0 ? (
              <div className="profile-row"><span style={{ color: "var(--text-faint)" }}>No Chrome profiles detected</span></div>
            ) : (
              <>
                <label className="profile-row" onClick={(e) => e.stopPropagation()}>
                  <span>Profile</span>
                  <select className="field" value={profile} onChange={(e) => setProfile(e.target.value)}>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <ul className="folder-tree" onClick={(e) => e.stopPropagation()}>
                  {tree.map((f) => (
                    <li key={f.id} className="tree-row" style={{ paddingLeft: 8 + f.depth * 18 }}>
                      <label>
                        <input type="checkbox" checked={!!picked[f.id]}
                               onChange={() => setPicked((p) => ({ ...p, [f.id]: !p[f.id] }))} />
                        <I.folder size={14} />
                        <span className="tree-label">{f.name}</span>
                        <span className="tree-count">{f.count}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </button>

          <button
            className={`source-opt dropzone ${mode === "file" ? "sel" : ""} ${dragOver ? "drag" : ""}`}
            onClick={() => { setMode("file"); fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input ref={fileInputRef} type="file" accept=".html,text/html"
                   style={{ display: "none" }}
                   onChange={(e) => pickFile(e.target.files && e.target.files[0])} />
            <span className="dropzone-icon" aria-hidden="true"><I.upload size={22} /></span>
            {file ? (
              <>
                <span className="dropzone-file">{file.name}</span>
                <span className="dropzone-hint">Ready to categorize</span>
              </>
            ) : (
              <>
                <span className="dropzone-title">Or drop a bookmarks.html</span>
                <span className="dropzone-hint">Drag a file here, or click to browse</span>
              </>
            )}
          </button>
        </div>

        <div className="flow-card-foot between">
          <button className="link-btn" onClick={() => nav("#/setup")}>← Setup</button>
          <PrimaryButton disabled={!ready} onClick={submit} icon={<I.arrowR size={16} />}>
            {busy ? "Loading…" : "Categorize"}
          </PrimaryButton>
        </div>
      </div>
    </FlowShell>
  );
}

// ── Categorizing (progress, real SSE) ──────────────────────────────────────
function CategorizingScreen({ jobId, total, onComplete, onError }) {
  const [phase, setPhase] = React.useState("Starting…");
  const [done, setDone] = React.useState(0);
  const [showCount, setShowCount] = React.useState(false);

  React.useEffect(() => {
    if (!jobId) return;
    const close = api.categorizeEvents(jobId, async (event) => {
      if (event.phase === "starting") setPhase("Reading your bookmarks…");
      else if (event.phase === "taxonomy") setPhase("Asking Claude to invent categories…");
      else if (event.phase === "assigning") {
        setPhase("Assigning bookmarks…");
        setShowCount(true);
        setDone(event.done || 0);
      } else if (event.phase === "complete") {
        try {
          const result = await api.categorizeResult(jobId);
          onComplete(result);
        } catch (err) {
          onError && onError(err.message);
        }
      } else if (event.phase === "error") {
        onError && onError(event.error || "Categorization failed");
      }
    });
    return close;
  }, [jobId, onComplete, onError]);

  return (
    <div className="screen categorizing-screen">
      <ProgressBlock phase={phase} done={showCount ? done : 0} total={showCount ? total : 0} />
    </div>
  );
}

Object.assign(window, { FlowShell, SetupScreen, SourceScreen, CategorizingScreen });
