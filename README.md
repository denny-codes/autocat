# AutoCat

A local web app that categorizes a messy folder of Chrome bookmarks using Claude.

Point it at a Chrome profile or drop in an exported `bookmarks.html`. AutoCat asks Claude to invent a sensible taxonomy, assigns every bookmark to a category, and exports a new `bookmarks.html` you can re-import into Chrome.

![Home grid](docs/home.png)

## Screenshots

| Categorizing | Export |
|---|---|
| ![Progress](docs/categorizing.png) | ![Export](docs/export.png) |

## Just point it at your local Claude Code

The whole setup is: **install Claude Code, run AutoCat.** That's it.

- **No API key to copy-paste.** AutoCat doesn't ask for an Anthropic key, and it never stores one. It talks to the `claude` binary already on your machine through the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk).
- **No second login.** If `claude --version` works in your terminal, AutoCat works. The setup screen verifies this in one step and then you're done.
- **No billing setup.** Categorization runs against your existing Claude subscription — same as any other Claude Code session. No usage dashboards to wire up, no per-request cost to monitor.
- **No keys on disk.** The only file AutoCat writes is `~/.autocat/config.json` — just your model preference (default: Haiku 4.5). Open it; there's nothing sensitive in there.
- **No cloud anything.** The app runs at `localhost:3000`. Your bookmarks never touch a server you don't control, except the round-trip to Claude that Claude Code makes anyway.

If you've ever set up an Anthropic SDK project, you know the drill: get a key from the console, put it in `.env`, hope nothing leaks it. AutoCat skips that entire path because Claude Code already did the hard part.

## Quick start

You need [Claude Code](https://claude.com/claude-code) installed and signed in, and Node 20+.

```sh
git clone https://github.com/denny-codes/autocat.git
cd autocat
npm install
npm start
```

Open <http://localhost:3000>. The first screen ("Claude Code detected v…") is how you'll know it found your local install.

## How it works

1. **Setup** — checks that `claude --version` works.
2. **Source** — pick a Chrome profile + folders, or drop an exported `bookmarks.html`.
3. **Categorize** — two-pass call to Claude via the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk):
   - **Taxonomy pass:** Claude proposes 5–15 categories sized to the dataset.
   - **Assignment pass:** bookmarks are batched (~80 at a time) and each batch is assigned to the taxonomy.
4. **Review** — edit category names/summaries, move bookmarks between categories.
5. **Export** — download a new `bookmarks.html` to re-import via `chrome://bookmarks → ⋮ → Import bookmarks from HTML`.

## Where data lives

- `~/.autocat/config.json` (mode `0600`) — chosen model and last profile. The only thing AutoCat writes to disk.
- Browser `localStorage` — light/dark theme preference.
- Everything else (parsed bookmarks, categorization jobs, the categorized result) is in-memory and gone on restart/refresh.
- Chrome's `Bookmarks` file is read, never written.

## Stack

- Node 20+ / Express
- `@anthropic-ai/claude-agent-sdk` for LLM access (routes through your local Claude Code)
- `cheerio` for parsing Netscape bookmark HTML
- React 18 UMD + Babel-standalone in the browser (no build step)
- UI design via [Claude design](https://claude.ai/design); see [`DESIGN.md`](DESIGN.md)
