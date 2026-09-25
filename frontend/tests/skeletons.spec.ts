import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * EVERY LIST PAGE HAS ITS OWN SKELETON (components/admin/skeleton.tsx), so a
 * new section cannot ship falling back to its parent's, which is how every
 * page used to show the dashboard's thin lines. Detail pages are outside the
 * (lists) groups on purpose: a loading boundary above them made a missing
 * record answer 200 (see app/admin/(lists)/loading.tsx).
 */
const groups = ["app/admin/(lists)", "app/portal/(lists)"];

test("each top-level list page has a loading.tsx shaped for it", () => {
  for (const g of groups) {
    const root = path.join(process.cwd(), g);
    expect(fs.existsSync(path.join(root, "loading.tsx")), `${g}/loading.tsx`).toBe(true);
    for (const dir of fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const file = path.join(root, dir.name, "loading.tsx");
      expect(fs.existsSync(file), `${g}/${dir.name}/loading.tsx`).toBe(true);
      expect(fs.readFileSync(file, "utf8")).toContain("<Skeleton title=");
    }
  }
});
