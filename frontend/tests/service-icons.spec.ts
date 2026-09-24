import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import * as lucide from "lucide-react";
import { SERVICE_ICONS } from "../components/ui/service-icons";

/**
 * THE REGISTRY COVERS EVERY ICON NAME THE SOURCE USES.
 *
 * ServiceIcon draws from components/ui/service-icons.ts, not from all of
 * lucide (which cost 217KB gzipped on every page). Its names arrive as
 * strings from data, so the compiler cannot check them: this does, by
 * finding every quoted string in the source that is a lucide icon name.
 * That is a superset of what ServiceIcon is handed, which is the safe side.
 */
test("every lucide icon name in the source is in the ServiceIcon registry", () => {
  const icons = new Set(Object.keys(lucide).filter((k) => /^[A-Z]/.test(k) && !k.startsWith("Lucide") && !k.endsWith("Icon") && k !== "Icon"));
  const root = path.resolve(__dirname, "..");
  const missing = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|mjs)$/.test(entry.name)) {
        for (const match of fs.readFileSync(full, "utf8").matchAll(/["'`]([A-Z][A-Za-z0-9]+)["'`]/g)) {
          if (icons.has(match[1]) && !SERVICE_ICONS[match[1]]) missing.add(`${match[1]} (${path.relative(root, full)})`);
        }
      }
    }
  };
  for (const dir of ["app", "components", "lib"]) walk(path.join(root, dir));
  expect([...missing], "add these to components/ui/service-icons.ts").toEqual([]);
});
