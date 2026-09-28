import "server-only";

import { presignGet, r2Config } from "@/lib/r2";
import type { DeliverableFile } from "@/lib/admin/types";

export type DeliverableFileLink = DeliverableFile & {
  open: string | null;
  download: string | null;
};

/**
 * Uploaded deliverables keep the media key, rather than a public URL. That
 * lets the two reader-facing actions mean different things: Open reads the
 * object, while Download asks R2 to return it as an attachment with its name.
 */
export function deliverableFileLinks(files: DeliverableFile[] | undefined): DeliverableFileLink[] {
  if (!files?.length) return [];
  const r2 = r2Config();
  if (!r2.ok) return files.map((file) => ({ ...file, open: null, download: null }));
  return files.map((file) => ({
    ...file,
    open: presignGet({ config: r2.config, key: file.key }),
    download: presignGet({ config: r2.config, key: file.key, download: file.name }),
  }));
}
