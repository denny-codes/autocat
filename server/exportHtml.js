function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toNetscapeHtml({ categories, title = "AutoCat Bookmarks" }) {
  const now = Math.floor(Date.now() / 1000);
  const lines = [];
  lines.push("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
  lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
  lines.push(`<TITLE>${escapeHtml(title)}</TITLE>`);
  lines.push(`<H1>${escapeHtml(title)}</H1>`);
  lines.push("<DL><p>");

  for (const cat of categories) {
    const label = cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name;
    lines.push(`    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(label)}</H3>`);
    lines.push("    <DL><p>");
    for (const bm of cat.bookmarks) {
      lines.push(`        <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${now}">${escapeHtml(bm.title)}</A>`);
    }
    lines.push("    </DL><p>");
  }

  lines.push("</DL><p>");
  return lines.join("\n");
}
