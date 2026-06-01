/* AutoCat — primitives: palette, icons, buttons, favicon, InlineEditable,
   MoveDropdown, Toast. Exported to window for the other babel scripts. */

// ── Category accent palettes (light / dark pairs) ──────────────────────────
const PALETTES = {
  meadow: { // spec default — muted, WCAG-AA
    name: "Meadow",
    pairs: [
      { l: "#C2603F", d: "#F0967C" }, // terracotta
      { l: "#3F7D6B", d: "#7CB29F" }, // sage
      { l: "#6B5C92", d: "#A092C2" }, // lavender
      { l: "#9A7322", d: "#E5C281" }, // mustard
      { l: "#496C90", d: "#809DBE" }, // slate blue
      { l: "#9E4B6C", d: "#CC819F" }, // rose
      { l: "#557D55", d: "#92BA92" }, // moss
    ],
  },
  dusk: { // cooler
    name: "Dusk",
    pairs: [
      { l: "#3E6F9E", d: "#84ABD6" },
      { l: "#5C6BB0", d: "#9AA6E0" },
      { l: "#7857A8", d: "#B69AD8" },
      { l: "#9A4C86", d: "#D68FC2" },
      { l: "#357C86", d: "#7CC0C8" },
      { l: "#4F7A55", d: "#92BE96" },
      { l: "#7A6248", d: "#C6A988" },
    ],
  },
  ember: { // warmer / brighter
    name: "Ember",
    pairs: [
      { l: "#B5482F", d: "#F58E72" },
      { l: "#A65B26", d: "#E8A368" },
      { l: "#94701F", d: "#DCBB5C" },
      { l: "#5E7A2E", d: "#A8C172" },
      { l: "#327563", d: "#7CC0AA" },
      { l: "#8C4A86", d: "#CC8FC6" },
      { l: "#A8456A", d: "#E88AAA" },
    ],
  },
};

function accentFor(palette, index, dark) {
  const pairs = (PALETTES[palette] || PALETTES.meadow).pairs;
  const p = pairs[index % pairs.length];
  return dark ? p.d : p.l;
}

// domain helper for favicons
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, ""); }
}

// ── Icons (minimal UI glyphs) ──────────────────────────────────────────────
const I = {};
const mk = (paths, vb = "0 0 24 24") => ({ size = 18, stroke = 1.6, style, className } = {}) =>
  React.createElement("svg", {
    width: size, height: size, viewBox: vb, fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round",
    strokeLinejoin: "round", style, className, "aria-hidden": true,
  }, paths.map((d, i) => React.createElement("path", { key: i, d })));

I.gear = mk([
  "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  "M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V19a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 17.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 6.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 1.6h.09A1.7 1.7 0 0 0 10.6 0",
]);
I.arrowR = mk(["M5 12h14", "M13 6l6 6-6 6"]);
I.arrowL = mk(["M19 12H5", "M11 18l-6-6 6-6"]);
I.pencil = mk(["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"]);
I.chevron = mk(["M6 9l6 6 6-6"]);
I.search = mk(["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M21 21l-4.3-4.3"]);
I.check = mk(["M20 6 9 17l-5-5"]);
I.x = mk(["M18 6 6 18", "M6 6l12 12"]);
I.sun = mk(["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z", "M12 1v2", "M12 21v2", "M4.2 4.2l1.4 1.4", "M18.4 18.4l1.4 1.4", "M1 12h2", "M21 12h2", "M4.2 19.8l1.4-1.4", "M18.4 5.6l1.4-1.4"]);
I.moon = mk(["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"]);
I.upload = mk(["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]);
I.folder = mk(["M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"]);
I.link = mk(["M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.7 1.7", "M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.7-1.7"]);
I.globe = mk(["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3 12h18", "M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"]);
I.spark = mk(["M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4", "M5.6 5.6l2.8 2.8", "M15.6 15.6l2.8 2.8", "M18.4 5.6l-2.8 2.8", "M8.4 15.6l-2.8 2.8"]);
I.trash = mk(["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"]);
I.ext = mk(["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14 21 3"]);

// ── Buttons ────────────────────────────────────────────────────────────────
function PrimaryButton({ children, onClick, disabled, icon, style }) {
  return (
    <button className="btn btn-primary" onClick={onClick} disabled={disabled} style={style}>
      {children}
      {icon ? <span className="btn-i">{icon}</span> : null}
    </button>
  );
}
function SecondaryButton({ children, onClick, disabled, icon, style }) {
  return (
    <button className="btn btn-secondary" onClick={onClick} disabled={disabled} style={style}>
      {icon ? <span className="btn-i">{icon}</span> : null}
      {children}
    </button>
  );
}
function IconButton({ label, onClick, children, active }) {
  return (
    <button className="icon-btn" aria-label={label} title={label}
            data-active={active ? "1" : "0"} onClick={onClick}>
      {children}
    </button>
  );
}

// ── Favicon ────────────────────────────────────────────────────────────────
function Favicon({ url, size = 18 }) {
  const [err, setErr] = React.useState(false);
  const domain = domainOf(url);
  const letter = (domain[0] || "•").toUpperCase();
  if (err) {
    return (
      <span className="favicon favicon-fallback" style={{ width: size, height: size, fontSize: size * 0.56 }}>
        {letter}
      </span>
    );
  }
  return (
    <img className="favicon" alt="" width={size} height={size} loading="lazy"
         src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
         onError={() => setErr(true)} />
  );
}

// ── InlineEditable — click to edit, Enter save, Esc cancel ─────────────────
function InlineEditable({ value, onChange, multiline = false, className = "", ariaLabel, placeholder }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const ref = React.useRef(null);

  React.useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  React.useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const v = ref.current.value;
      ref.current.setSelectionRange(v.length, v.length);
    }
  }, [editing]);

  const commit = () => { setEditing(false); const t = draft.trim(); if (t && t !== value) onChange(t); else setDraft(value); };
  const cancel = () => { setEditing(false); setDraft(value); };
  const onKey = (e) => {
    if (e.key === "Enter" && (!multiline || e.metaKey)) { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  if (editing) {
    const Tag = multiline ? "textarea" : "input";
    return (
      <Tag ref={ref} className={`inline-edit ${className}`} value={draft}
           rows={multiline ? 2 : undefined} aria-label={ariaLabel}
           onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={commit} />
    );
  }
  return (
    <span className={`inline-display ${className}`} tabIndex={0} role="button"
          aria-label={`${ariaLabel}: ${value}. Click to edit.`}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } }}>
      {value || <span className="inline-ph">{placeholder}</span>}
    </span>
  );
}

// ── MoveDropdown — searchable list of other categories ─────────────────────
function MoveDropdown({ categories, currentId, onMove }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [hi, setHi] = React.useState(0);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const others = categories.filter((c) => c.id !== currentId);
  const filtered = others.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  React.useEffect(() => { setHi(0); }, [q, open]);

  const pick = (c) => { if (!c) return; setOpen(false); setQ(""); onMove(c.id); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(filtered.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(filtered[hi]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  };

  return (
    <div className="move-wrap" ref={wrapRef}>
      <button className="move-btn" aria-haspopup="listbox" aria-expanded={open}
              onClick={() => setOpen((o) => !o)}>
        Move <I.chevron size={14} />
      </button>
      {open && (
        <div className="move-pop" role="dialog">
          <div className="move-search">
            <I.search size={15} />
            <input ref={inputRef} value={q} placeholder="Move to…"
                   onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
          </div>
          <ul className="move-list" role="listbox">
            {filtered.length === 0 && <li className="move-empty">No categories</li>}
            {filtered.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === hi}
                  className="move-opt" data-hi={i === hi ? "1" : "0"}
                  onMouseEnter={() => setHi(i)} onClick={() => pick(c)}>
                <span className="move-emoji">{c.emoji}</span>
                <span className="move-name">{c.name}</span>
                <span className="move-count">{c.bookmarks.length}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toast, onUndo, onDismiss }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.error ? "error" : ""}`} role="status">
      <span className="toast-msg">{toast.msg}</span>
      {toast.undo && <button className="toast-action" onClick={onUndo}>Undo</button>}
      <button className="toast-x" aria-label="Dismiss" onClick={onDismiss}><I.x size={14} /></button>
    </div>
  );
}

Object.assign(window, {
  PALETTES, accentFor, domainOf, I,
  PrimaryButton, SecondaryButton, IconButton, Favicon,
  InlineEditable, MoveDropdown, Toast,
});
