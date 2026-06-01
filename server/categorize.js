import { query } from "@anthropic-ai/claude-agent-sdk";

const BATCH_SIZE = 80;

async function askClaude({ systemPrompt, userPrompt, model }) {
  const iter = query({
    prompt: userPrompt,
    options: {
      model,
      systemPrompt,
      allowedTools: [],
      maxTurns: 1,
      permissionMode: "bypassPermissions",
    },
  });

  let result = null;
  let assistantText = "";
  for await (const message of iter) {
    if (message.type === "assistant") {
      const content = message.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text") assistantText += block.text;
        }
      }
    } else if (message.type === "result") {
      result = message;
    }
  }

  if (result?.is_error) {
    throw new Error(`Claude Code error: ${result.result || "unknown"}`);
  }
  const text = (result?.result ?? assistantText).trim();
  if (!text) throw new Error("Empty response from Claude Code");
  return text;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1]);
  const firstBrace = text.search(/[\[{]/);
  if (firstBrace >= 0) {
    const trimmed = text.slice(firstBrace);
    return JSON.parse(trimmed);
  }
  return JSON.parse(text);
}

const EMOJI_POOL = ["📚", "🛠", "🎨", "📰", "💼", "🍳", "🎬", "🎵", "🏃", "🧠", "🔬", "💰", "✈️", "🛒", "🌱", "🎮", "📷", "🧰"];

export async function proposeTaxonomy(bookmarks, model) {
  const targetCount = Math.min(12, Math.max(4, Math.round(bookmarks.length / 10)));
  const sample = bookmarks.slice(0, 250);

  const systemPrompt = `You are organizing a user's bookmarks into clean, meaningful categories.

Return ONLY a JSON array of categories. Each category object has these fields:
- id: short kebab-case slug (e.g. "learning", "dev-tools")
- name: human-readable title (1-3 words, e.g. "Learning", "Dev Tools")
- summary: one short phrase (under 60 chars) describing the contents
- emoji: a single emoji character that fits the category

Aim for roughly ${targetCount} categories. Categories should:
- Be MECE (mutually exclusive, collectively exhaustive)
- Cover the dataset well — no "Misc" or "Other" unless truly necessary
- Be specific enough to be useful, broad enough to hold several bookmarks each

Return JSON only. No prose, no fences.`;

  const userPrompt = `Here are ${bookmarks.length} bookmarks (showing ${sample.length}):

${sample.map((b, i) => `${i + 1}. ${b.title} — ${b.url}`).join("\n")}

Propose the category taxonomy as JSON.`;

  const text = await askClaude({ systemPrompt, userPrompt, model });
  const parsed = extractJson(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Taxonomy response was not a non-empty array");
  }
  return parsed.map((c, i) => ({
    id: c.id || `cat-${i}`,
    name: c.name || c.id || `Category ${i + 1}`,
    summary: c.summary || "",
    emoji: c.emoji || EMOJI_POOL[i % EMOJI_POOL.length],
  }));
}

export async function assignCategories(bookmarks, taxonomy, model, onProgress) {
  const taxonomyJson = JSON.stringify(taxonomy.map((c) => ({ id: c.id, name: c.name, summary: c.summary })), null, 2);
  const systemPrompt = `You assign bookmarks to categories from a fixed taxonomy.

Available categories (use the id field exactly):
${taxonomyJson}

Return ONLY a JSON array. Each element: {"id": "<bookmark-id>", "category": "<category-id>"}.
Every input bookmark MUST appear exactly once in the output. Pick the single best category for each.
Return JSON only. No prose, no fences.`;

  const validIds = new Set(taxonomy.map((c) => c.id));
  const assignments = new Map();
  const total = bookmarks.length;
  let done = 0;

  if (onProgress) onProgress({ phase: "assigning", done: 0, total });

  for (let start = 0; start < total; start += BATCH_SIZE) {
    const batch = bookmarks.slice(start, start + BATCH_SIZE);
    const userPrompt = `Assign these ${batch.length} bookmarks:

${batch.map((b) => `- id: ${b.id} | title: ${b.title} | url: ${b.url}`).join("\n")}`;

    let parsed;
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await askClaude({ systemPrompt, userPrompt, model });
        parsed = extractJson(text);
        if (Array.isArray(parsed)) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!Array.isArray(parsed)) {
      console.warn("Batch assignment failed, falling back to Uncategorized", lastError?.message);
      for (const bm of batch) assignments.set(bm.id, "uncategorized");
    } else {
      for (const row of parsed) {
        if (row && typeof row === "object") {
          const cat = validIds.has(row.category) ? row.category : "uncategorized";
          assignments.set(row.id, cat);
        }
      }
      for (const bm of batch) {
        if (!assignments.has(bm.id)) assignments.set(bm.id, "uncategorized");
      }
    }

    done += batch.length;
    if (onProgress) onProgress({ phase: "assigning", done, total });
  }

  return assignments;
}

export async function categorize(bookmarks, model, onProgress) {
  if (onProgress) onProgress({ phase: "taxonomy", done: 0, total: bookmarks.length });
  const taxonomy = await proposeTaxonomy(bookmarks, model);
  const assignments = await assignCategories(bookmarks, taxonomy, model, onProgress);

  const usedUncategorized = [...assignments.values()].includes("uncategorized");
  const finalTaxonomy = usedUncategorized
    ? [...taxonomy, { id: "uncategorized", name: "Uncategorized", summary: "Bookmarks that didn't fit a category", emoji: "📂" }]
    : taxonomy;

  const byCategory = new Map(finalTaxonomy.map((c) => [c.id, { ...c, bookmarks: [] }]));
  for (const bm of bookmarks) {
    const catId = assignments.get(bm.id) || "uncategorized";
    const bucket = byCategory.get(catId) || byCategory.get("uncategorized");
    if (bucket) bucket.bookmarks.push(bm);
  }

  const categories = [...byCategory.values()].filter((c) => c.bookmarks.length > 0 || c.id !== "uncategorized");
  return { categories };
}
