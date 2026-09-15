/**
 * Puts the posts from lib/blog.ts into blog_posts.
 *
 * DRY RUN BY DEFAULT. It prints exactly what it would write and touches
 * nothing. `--commit` is the only thing that makes it write, because a seed
 * that runs on invocation is one tab-complete away from being run against the
 * wrong database.
 *
 *   node scripts/seed-blog.mjs              # show me
 *   node scripts/seed-blog.mjs --commit     # do it
 *
 * IDEMPOTENT, by upserting on `slug`. Running it twice is not an error and does
 * not duplicate a post, so it is safe to re-run after editing the fixture. It
 * does NOT delete: a post removed from lib/blog.ts stays in the table, because
 * this script cannot tell "deleted from the fixture" apart from "written in the
 * editor and never added to the fixture", and guessing wrong destroys somebody's
 * work.
 *
 * THE EM DASHES ARE ALREADY OUT of lib/blog.ts, rewritten by hand rather than
 * swapped, because they were doing two different jobs in that prose. This script
 * therefore does not transform the copy at all -- it refuses to run if it finds
 * one, so the fixture stays the single source of truth rather than the database
 * drifting into a tidied copy of it.
 */
import { pool } from "./cockroach-client.mjs";

const COMMIT = process.argv.includes("--commit");
const EM_DASH = "—";

/* The fixture is TypeScript, so it is read as text and parsed rather than
   imported. A build step just to seed a table is a worse trade than one
   regex, and the shape here is stable: `export const BLOG_POSTS` holds object
   literals with known keys. */
const source = await (await import("node:fs/promises"))
  .readFile(new URL("../lib/blog.ts", import.meta.url), "utf8");

if (source.includes(EM_DASH)) {
  const lines = source.split("\n")
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => l.includes(EM_DASH));
  console.error(`Refusing to seed: lib/blog.ts still contains ${lines.length} em dash line(s).`);
  console.error("They are punctuation decisions, not a find-and-replace. Fix the fixture first:");
  for (const [n, l] of lines.slice(0, 8)) console.error(`  ${n}: ${l.trim().slice(0, 96)}`);
  process.exit(1);
}

/* Importing the module would need a TypeScript loader; evaluating the array
   literal does not. The file is ours and is not user input. */
const start = source.indexOf("export const BLOG_POSTS");
/* The `[` AFTER the `=`, not the first one found. The declaration is
   `export const BLOG_POSTS: BlogPost[] = [`, so searching from the name finds
   the empty brackets in the TYPE and the brace matcher below then closes
   immediately on an empty array -- which parses cleanly and seeds nothing. */
const open = source.indexOf("[", source.indexOf("=", start));
let depth = 0, end = open;
for (let i = open; i < source.length; i++) {
  if (source[i] === "[") depth++;
  else if (source[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
}
const literal = source.slice(open, end + 1);
/* The literal references `UNSURE`-style constants nowhere, and the only
   non-JSON syntax in it is unquoted keys and trailing commas, which a
   Function body handles natively. */
const posts = Function(`"use strict"; return (${literal});`)();

if (!Array.isArray(posts) || posts.length === 0) {
  console.error("Parsed no posts out of lib/blog.ts. Has its shape changed?");
  process.exit(1);
}

const REQUIRED = ["slug", "title", "seoTitle", "description", "excerpt", "date", "topic", "tags", "cover", "body"];
const problems = [];
for (const p of posts) {
  for (const key of REQUIRED) {
    if (p[key] === undefined) problems.push(`${p.slug ?? "(no slug)"}: missing ${key}`);
  }
  if (p.body && !Array.isArray(p.body)) problems.push(`${p.slug}: body is not an array`);
}
if (problems.length) {
  console.error("Refusing to seed:");
  for (const line of problems) console.error("  " + line);
  process.exit(1);
}

console.log(`${posts.length} posts in lib/blog.ts\n`);
for (const p of posts) {
  const words = p.body.reduce((n, b) => {
    if (b.kind === "list") return n + b.items.join(" ").trim().split(/\s+/).filter(Boolean).length;
    if (b.kind === "callout") return n + `${b.title} ${b.text}`.trim().split(/\s+/).filter(Boolean).length;
    return n + String(b.text ?? "").trim().split(/\s+/).filter(Boolean).length;
  }, 0);
  console.log(`  ${p.slug}`);
  console.log(`    topic ${p.topic}  ${p.body.length} blocks  ${words} words  published ${p.date}`);
  console.log(`    title ${p.title.slice(0, 74)}`);
}

if (!COMMIT) {
  console.log("\nDRY RUN. Nothing was written. Re-run with --commit to write these rows.");
  process.exit(0);
}

const db = pool();
let added = 0, updated = 0;
try {
  for (const p of posts) {
    /* `xmax` is how Postgres tells an insert from an update on a conflict, and
       CockroachDB does not expose it. Asking first is one extra read on a
       six-row seed and it makes the summary honest. */
    const before = await db.query("SELECT 1 FROM blog_posts WHERE slug = $1", [p.slug]);
    await db.query(
      `INSERT INTO blog_posts
         (slug, title, seo_title, description, excerpt, topic, tags, cover, body, status, published_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::JSONB,$8,$9::JSONB,'published',$10,$11)
       ON CONFLICT (slug) DO UPDATE SET
         title = excluded.title,
         seo_title = excluded.seo_title,
         description = excluded.description,
         excerpt = excluded.excerpt,
         topic = excluded.topic,
         tags = excluded.tags,
         cover = excluded.cover,
         body = excluded.body,
         status = excluded.status,
         published_at = excluded.published_at,
         updated_at = excluded.updated_at`,
      [
        p.slug, p.title, p.seoTitle, p.description, p.excerpt, p.topic,
        JSON.stringify(p.tags), p.cover, JSON.stringify(p.body),
        new Date(p.date), p.updated ? new Date(p.updated) : null,
      ],
    );
    if (before.rowCount) updated++; else added++;
  }
  console.log(`\nWrote ${posts.length}: ${added} added, ${updated} updated.`);
} finally {
  await db.end?.();
}
