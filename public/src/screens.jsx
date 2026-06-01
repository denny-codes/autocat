/* AutoCat — Home grid + Category detail. */

// ── Shared header ──────────────────────────────────────────────────────────
function AppHeader({ data, dark, onToggleTheme, onSettings }) {
  const total = data.categories.reduce((n, c) => n + c.bookmarks.length, 0);
  return (
    <header className="app-header">
      <button className="brand" onClick={() => (location.hash = "#/home")} aria-label="AutoCat home">
        <span className="logo-stack" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-text">
          <span className="brand-name">AutoCat</span>
          <span className="brand-sub">{total} bookmarks · {data.source}</span>
        </span>
      </button>
      <div className="header-actions">
        <IconButton label={dark ? "Switch to light" : "Switch to dark"} onClick={onToggleTheme}>
          {dark ? <I.sun size={18} /> : <I.moon size={18} />}
        </IconButton>
        <IconButton label="Settings" onClick={onSettings}><I.gear size={18} /></IconButton>
      </div>
    </header>
  );
}

// ── Home (category grid) ───────────────────────────────────────────────────
function HomeScreen({ data, dark, palette, treatment, columns, onToggleTheme, nav, onExport, onRecategorize }) {
  const total = data.categories.reduce((n, c) => n + c.bookmarks.length, 0);
  const nCats = data.categories.length;

  if (nCats === 0) {
    return (
      <div className="screen home-screen">
        <AppHeader data={data} dark={dark} onToggleTheme={onToggleTheme} onSettings={() => nav("#/setup")} />
        <main className="home-main">
          <div className="empty-home">
            <span className="empty-home-mark" aria-hidden="true"><I.folder size={26} /></span>
            <h2>No categories yet</h2>
            <p>There are no bookmarks loaded. Choose a source to get started.</p>
            <PrimaryButton onClick={() => nav("#/source")} icon={<I.arrowR size={16} />}>Choose a source</PrimaryButton>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="screen home-screen">
      <AppHeader data={data} dark={dark} onToggleTheme={onToggleTheme} onSettings={() => nav("#/setup")} />
      <main className="home-main">
        <div className="subhead">
          <h1 className="subhead-title">
            <b>{total}</b> bookmarks <span className="subhead-arrow">→</span> <b>{nCats}</b> categories
          </h1>
          <PrimaryButton onClick={onExport} icon={<I.upload size={16} />}>Export bookmarks.html</PrimaryButton>
        </div>

        <div className="card-grid" style={{ "--cols": columns }}>
          {data.categories.map((c, i) => (
            <CategoryCard key={c.id} category={c} index={i} palette={palette}
                          dark={dark} treatment={treatment} onOpen={(id) => nav(`#/category/${id}`)} />
          ))}
        </div>

        <footer className="home-footer">
          <span>Categorized with Claude</span>
          <span className="dot">·</span>
          <button className="link-btn" onClick={onRecategorize}>Recategorize</button>
        </footer>
      </main>
    </div>
  );
}

// ── Category detail ────────────────────────────────────────────────────────
function CategoryDetail({ data, category, index, palette, dark, onBack, onMove, onEditName, onEditSummary, onDelete }) {
  const acc = accentFor(palette, index, dark);
  const count = category.bookmarks.length;

  return (
    <div className="screen detail-screen" style={{ "--acc": acc, "--focus": acc }}>
      <main className="detail-main">
        <button className="back-link" onClick={onBack}>
          <I.arrowL size={16} /> Back to all categories
        </button>

        <div className="detail-head">
          <span className="detail-emoji" aria-hidden="true">{category.emoji}</span>
          <div className="detail-headtext">
            <div className="detail-nameline">
              <InlineEditable className="detail-name" value={category.name}
                              ariaLabel="Category name" onChange={onEditName} />
              <span className="detail-pencil" aria-hidden="true"><I.pencil size={15} /></span>
            </div>
            <InlineEditable className="detail-summary" value={category.summary}
                            ariaLabel="Category summary" placeholder="Add a summary…"
                            multiline onChange={onEditSummary} />
          </div>
          <span className="detail-count">{count}</span>
        </div>

        <div className="detail-rule" />

        {count === 0 ? (
          <div className="detail-empty">
            <p>No bookmarks left in this category.</p>
            <SecondaryButton icon={<I.trash size={15} />} onClick={onDelete}>Delete category</SecondaryButton>
          </div>
        ) : (
          <div className="bm-list">
            {category.bookmarks.map((b) => (
              <BookmarkRow key={b.id} bookmark={b} categories={data.categories}
                           currentId={category.id} onMove={onMove} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

Object.assign(window, { AppHeader, HomeScreen, CategoryDetail });
