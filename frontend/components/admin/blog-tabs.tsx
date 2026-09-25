import Link from "next/link";

/** Blog's two halves: posts, and the case studies on /work. One nav item,
    because both are what the site says about the studio's work. */
export function BlogTabs({ on }: { on: "posts" | "work" }) {
  return (
    <nav className="ad__switch adBlogTabs" aria-label="Blog">
      <Link href="/admin/blog" aria-current={on === "posts" ? "true" : undefined}>Posts</Link>
      <Link href="/admin/blog/work" aria-current={on === "work" ? "true" : undefined}>Case studies</Link>
    </nav>
  );
}
