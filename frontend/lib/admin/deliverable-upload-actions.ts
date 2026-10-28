"use server";

import { randomUUID } from "node:crypto";
import { presignPut, r2Config } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { checkDeliverableFile } from "@/lib/deliverable-upload-rules";
import { getProject } from "./store";
import { actorName, allow } from "./guard";
import { outOfScope } from "./staff-scope";

type Signed = { ok: true; url: string; key: string; contentType: string } | { ok: false; error: string };

/**
 * Permission to put one deliverable file in the private bucket, under its
 * project, for fifteen minutes (long enough to start a large upload on a slow
 * line). The server picks the key and signs the type; the browser only carries
 * the bytes. The deliverable action confirms the object arrived before it
 * records it (lib/admin/actions.ts).
 */
export async function signDeliverableUpload(input: { projectId: string; filename: string; size: number }): Promise<Signed> {
  const refused = await allow("projects");
  if (refused) return { ok: false, error: refused.message ?? "Sign in again, then retry." };
  const projectId = String(input?.projectId ?? "");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(projectId) || !getProject(projectId)) return { ok: false, error: "That project is no longer there." };
  const scoped = await outOfScope({ project: projectId });
  if (scoped) return { ok: false, error: scoped.message ?? "This is not one of your projects." };

  /* Abuse control, not a quota: one instance's memory, so the real ceiling is
     this times the warm instances. Thirty in ten minutes is three full versions. */
  const limit = rateLimit(`deliverable-sign:${await actorName()}`, 30, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: "That is a lot of uploads at once. Give it a minute and carry on." };

  const file = checkDeliverableFile(String(input?.filename ?? "").slice(0, 200), Number(input?.size));
  if (!file.ok) return file;
  const config = r2Config();
  if (!config.ok) return { ok: false, error: `Uploads are not configured: ${config.missing.join(", ")} not set.` };

  const key = `deliverables/${projectId}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${file.ext}`;
  const signed = presignPut({ config: config.config, key, contentType: file.contentType, expiresIn: 900 });
  return { ok: true, url: signed.url, key, contentType: file.contentType };
}
