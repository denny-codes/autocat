/* AutoCat — card components: MiniBookmarkCard, CardStack (3 treatments),
   CategoryCard, BookmarkRow, ProgressBlock. */

const _reduceMotion = typeof window !== "undefined" &&
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Per-treatment placement of stacked mini-cards by depth (0 = top/front).
// x,y in px; r in deg. h = hovered (slightly more spread / lift).
const STACK_CFG = {
  hand: {
    x: (d, h) => d * (h ? 13 : 10),
    y: (d, h) => d * (h ? 18 : 15),
    r: (d) => d * 1.9,
  },
  cascade: {
    x: (d) => d * 4,
    y: (d, h) => d * (h ? 42 : 40),
    r: () => 0,
  },
  riffle: {
    x: (d, h) => ([0, 15, -7][d] || 0) * (h ? 1.22 : 1),
    y: (d, h) => d * (h ? 17 : 14),
    r: (d) => [0, 3.3, -2.7][d] || 0,
  },
};

// Height the stack region needs so all 3 cards (at max hover spread) are visible.
const MINI_H = 46;
function stackRegionHeight(treatment) {
  const cfg = STACK_CFG[treatment] || STACK_CFG.hand;
  return Math.round(cfg.y(2, true) + MINI_H + 6);
}

// ── MiniBookmarkCard — the small card inside the stack (and skeletons) ──────
function MiniBookmarkCard({ bookmark, depth = 0, treatment = "hand", hover = false, skeleton = false }) {
  const cfg = STACK_CFG[treatment] || STACK_CFG.hand;
  const flat = _reduceMotion;
  const x = cfg.x(depth, hover);
  const y = cfg.y(depth, hover);
  const r = flat ? 0 : cfg.r(depth);
  const dim = depth === 0 ? 1 : depth === 1 ? 0.985 : 0.97;

  const style = {
    transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${dim})`,
    zIndex: 10 - depth,
    background: depth === 0 ? "var(--mini)" : "var(--mini-2)",
  };

  if (skeleton) {
    return (
      <div className="mini-card mini-skel" style={style} aria-hidden="true">
        <span className="mini-fav skel-dot" />
        <span className="skel-line" style={{ width: `${70 - depth * 12}%` }} />
      </div>
    );
  }
  return (
    <div className="mini-card" style={style} aria-hidden="true">
      <Favicon url={bookmark.url} size={17} />
      <span className="mini-title">{bookmark.title}</span>
    </div>
  );
}

// ── CardStack — the brand moment ───────────────────────────────────────────
function CardStack({ bookmarks, treatment = "hand", hover = false, skeleton = false }) {
  const items = skeleton ? [0, 1, 2] : bookmarks.slice(0, 3);
  // render back-most first so front card paints on top
  const ordered = items.map((_, i) => items.length - 1 - i);
  return (
    <div className={`card-stack ${hover ? "is-hover" : ""}`} aria-hidden="true">
      {ordered.map((d) => (
        <MiniBookmarkCard key={d} depth={d} treatment={treatment} hover={hover}
                          skeleton={skeleton} bookmark={skeleton ? null : items[d]} />
      ))}
    </div>
  );
}

// ── CategoryCard — home grid signature component ───────────────────────────
function CategoryCard({ category, index, palette, dark, treatment, onOpen }) {
  const [hover, setHover] = React.useState(false);
  const acc = accentFor(palette, index, dark);
  const empty = category.bookmarks.length === 0;

  const open = () => onOpen(category.id);

  if (empty) {
    return (
      <div className="cat-card cat-empty" style={{ "--acc": acc }}>
        <div className="cat-empty-inner">no bookmarks</div>
      </div>
    );
  }

  return (
    <button
      className={`cat-card ${hover ? "is-hover" : ""}`}
      style={{ "--acc": acc, "--focus": acc }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={open}
      aria-label={`${category.name} category, ${category.bookmarks.length} bookmarks`}
    >
      <div className="cat-head">
        <span className="cat-emoji" aria-hidden="true">{category.emoji}</span>
        <span className="cat-name">{category.name}</span>
        <span className="cat-count">{category.bookmarks.length}</span>
      </div>
      <p className="cat-summary">{category.summary}</p>
      <div className="cat-stack-region" style={{ minHeight: stackRegionHeight(treatment) }}>
        <CardStack bookmarks={category.bookmarks} treatment={treatment} hover={hover} />
      </div>
      <span className="cat-viewall">View all <I.arrowR size={15} /></span>
    </button>
  );
}

// ── BookmarkRow — detail page list row ─────────────────────────────────────
function BookmarkRow({ bookmark, categories, currentId, onMove }) {
  return (
    <div className="bm-row">
      <Favicon url={bookmark.url} size={20} />
      <div className="bm-main">
        <a className="bm-title" href={bookmark.url} target="_blank" rel="noreferrer noopener">
          {bookmark.title}
        </a>
        <span className="bm-url">{domainOf(bookmark.url)}{(() => {
          try { const p = new URL(bookmark.url).pathname; return p && p !== "/" ? p : ""; } catch { return ""; }
        })()}</span>
      </div>
      <div className="bm-actions">
        <a className="bm-open" href={bookmark.url} target="_blank" rel="noreferrer noopener"
           aria-label="Open in new tab"><I.ext size={15} /></a>
        <MoveDropdown categories={categories} currentId={currentId} onMove={(to) => onMove(bookmark.id, to)} />
      </div>
    </div>
  );
}

// ── ProgressBlock — centered status during categorization ──────────────────
function ProgressBlock({ phase, done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress-block">
      <div className="progress-spark"><I.spark size={22} /></div>
      <div className="progress-status">{phase}</div>
      {total > 0 && (
        <>
          <div className="progress-count">
            Categorized <b>{done}</b> of <b>{total}</b>
          </div>
          <div className="progress-bar"><span style={{ width: `${pct}%` }} /></div>
        </>
      )}
      <div className="progress-skel" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel-card">
            <div className="skel-card-head">
              <span className="skel-dot" /><span className="skel-line" style={{ width: "44%" }} />
            </div>
            <div className="skel-stack"><CardStack skeleton treatment="hand" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  MiniBookmarkCard, CardStack, CategoryCard, BookmarkRow, ProgressBlock,
});
