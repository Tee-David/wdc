"use client";

export async function meetingRequest(body: Record<string, unknown>) {
  const response = await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}
/** Poll a persisted command, never repeat its mutation. An interrupted tab can resume by ID. */
export async function meetingCommand(body: Record<string, unknown>, progress: (message: string) => void) {
  const stored = sessionStorage.getItem("wdc:meeting-command");
  const previous = stored ? JSON.parse(stored) as { id:string;token?:string;action:string;scope:string } : null;
  const scope=JSON.stringify(body);
  if (previous && (previous.action !== body.action || previous.scope !== scope)) throw new Error("Finish checking your previous meeting request before making a different change.");
  const id = previous?.id || crypto.randomUUID();
  const request = { ...body, id };
  sessionStorage.setItem("wdc:meeting-command", JSON.stringify({ id, token: body.token, action:body.action,scope }));
  let state = previous ? await meetingRequest({action:"status",id,token:previous.token}) : await meetingRequest(request);
  for (let n = 0; n < 30 && ["pending", "executing"].includes(state.state); n++) {
    progress("Your request is saved. Checking the scheduling provider…");
    await new Promise(resolve => setTimeout(resolve, 1500));
    state = await meetingRequest({ action: "status", id, token: body.token });
  }
  if (state.state === "failed") sessionStorage.removeItem("wdc:meeting-command");
  if (state.state !== "completed") throw new Error(state.error || "Your request is still being checked. Refresh its status before making another request.");
  sessionStorage.removeItem("wdc:meeting-command");
  return state.result;
}
export function guestToken() {
  const existing = sessionStorage.getItem("wdc:booking-token");
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token=Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem("wdc:booking-token",token);
  return token;
}
