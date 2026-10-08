import { expect, test } from "@playwright/test";
import { ICON_COLORS, iconTileStyle, isIconColor } from "../lib/project-icons";

test("icon colours are a closed set of seven keys, and only a key reaches a style", () => {
  expect(ICON_COLORS.map((c) => c.key)).toEqual(["navy", "orange", "green", "purple", "red", "teal", "slate"]);
  for (const c of ICON_COLORS) expect(isIconColor(c.key)).toBe(true);
  for (const bad of ["", "NAVY", "#b84a00", "red; background:url(x)", undefined, 3, null]) expect(isIconColor(bad)).toBe(false);
  expect(iconTileStyle("orange")).toEqual({ background: "#b84a00", color: "#fff" });
  expect(iconTileStyle(undefined)).toBeUndefined();
  expect(iconTileStyle("#fff")).toBeUndefined();
});
