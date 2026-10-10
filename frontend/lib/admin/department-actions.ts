"use server";

import { revalidatePath } from "next/cache";
import { owner, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { syncStore } from "./persist";
import { commitClientDepartments } from "@/lib/workspace/department-events";
import { dispatchWorkspaceEvents } from "@/lib/workspace/events";
import { after } from "next/server";
import * as store from "./store";
import {
  createDepartment, deleteDepartment, listDepartments, renameDepartment, setMembers,
} from "@/lib/departments";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = () => { revalidatePath("/admin/users/departments"); revalidatePath("/admin/clients"); };

function clean(name: string) {
  return name.length >= 2 && name.length <= 60 ? null : "A name of 2 to 60 characters, like Branding or SEO.";
}

export async function addDepartment(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const name = text(fd, "name");
  const bad = clean(name); if (bad) return FAIL({ name: bad });
  if (await createDepartment(name) === "taken") return FAIL({ name: "A department with that name exists (or migration 0040 is not applied yet: Settings › System)." });
  done();
  return OK(`${name} added.`);
}

export async function editDepartment(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  const name = text(fd, "name");
  const bad = clean(name); if (bad) return FAIL({ name: bad });
  if (await renameDepartment(text(fd, "id"), name) === "taken") return FAIL({ name: "Another department already has that name." });
  done();
  return OK("Updated.");
}

/**
 * The people in a department. A department that still looks after clients
 * keeps at least one active person: taking out the last one is refused, and
 * the message says which clients would be left without anyone.
 */
export async function saveDepartmentMembers(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  await syncStore();
  const id = text(fd, "id");
  const ids = fd.getAll("members").map(String);
  const dept = (await listDepartments())?.find((d) => d.id === id);
  if (!dept) return FAIL({}, "That department is no longer there.");
  const clients = store.clientsInDepartment(id);
  if (!ids.length && clients.length) {
    return FAIL({ members: `${clients.length} client${clients.length === 1 ? " is" : "s are"} looked after by ${dept.name} (${clients.slice(0, 3).map((c) => c.company).join(", ")}${clients.length > 3 ? "…" : ""}). Keep at least one person, or move those clients to another department first.` });
  }
  await setMembers(id, ids);
  done();
  return OK("Updated.");
}

export async function removeDepartment(_p: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await owner(); if (refused) return refused;
  await syncStore();
  const id = text(fd, "id");
  const clients = store.clientsInDepartment(id);
  if (clients.length) return FAIL({}, `${clients.length} client${clients.length === 1 ? " is" : "s are"} assigned to this department. Move them to another department first, so nobody is left without a team.`);
  await deleteDepartment(id);
  done();
  return OK("Department removed. Its people keep their accounts.");
}

/** Which departments look after a client. Anyone who works on clients may set it. */
export async function saveClientDepartments(_p: ActionState, fd: FormData): Promise<ActionState> {
  await syncStore();
  const refused = await allow("clients"); if (refused) return refused;
  const id = text(fd, "id");
  const departments=await listDepartments();
  const known = new Set(departments?.map((d) => d.id) ?? []);
  const ids = fd.getAll("departments").map(String).filter((x) => known.has(x));
  try {
    const result=await commitClientDepartments({clientId:id,departmentIds:ids});
    if(result.eventIds.length)after(()=>dispatchWorkspaceEvents({eventIds:result.eventIds,limit:1}));
  }catch(error){return FAIL({},error instanceof Error?error.message:"Departments could not be updated.");}
  revalidatePath(`/admin/clients/${id}`); done();
  return OK("Updated.");
}
