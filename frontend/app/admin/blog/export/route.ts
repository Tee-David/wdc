import { NextResponse } from "next/server";
import { owner } from "@/lib/admin/guard";
import { postsForAdmin } from "@/lib/blog-db";
import { csvBody, CSV_HEADERS } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

/** Every post as CSV, owner only, the same guard as every admin write. */
export async function GET() {
  if (await owner()) return new NextResponse("Not found", { status: 404 });
  let posts;
  try { posts = await postsForAdmin(500); } catch { return new NextResponse("The posts could not be read just now.", { status: 503 }); }
  const header = ["Title", "Address", "State", "Service", "Tags", "Date shown", "Updated", "Last saved", "Saved by"];
  const rows = posts.map((p) => [
    p.title, `/blog/${p.slug}`,
    p.status === "draft" ? "Draft" : p.scheduled ? "Scheduled" : "Published",
    p.topic, p.tags.join("; "), p.publishedAt?.slice(0, 10) ?? "", p.updated ?? "",
    p.savedAt?.slice(0, 10) ?? "", p.savedBy ?? "",
  ]);
  return new NextResponse(csvBody([header, ...rows]), { headers: CSV_HEADERS("wdc-blog-posts.csv") });
}
