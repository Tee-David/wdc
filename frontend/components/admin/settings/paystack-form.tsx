"use client";
import { Panel } from "../bits";
import { Select } from "../form";
import { SettingsForm, Switch } from "./kit";
import { savePaystackSettings } from "@/lib/admin/paystack-settings-actions";
import type { PaystackMode } from "@/lib/paystack";

export function PaystackForm({mode,testReady,liveReady}:{mode:PaystackMode;testReady:boolean;liveReady:boolean}) {
  return <SettingsForm action={savePaystackSettings} confirm="Update payment mode? Live accepts real payments. Existing checkouts keep their original mode."><Panel title="Paystack payment mode"><div className="adSetPad ad__stack"><Select name="mode" label="Payment mode" defaultValue={mode} options={[{value:"test",label:"Test — simulated payments"},{value:"live",label:"Live — real payments"}]} /><p>Test checkouts never settle invoices or send payment receipts. Existing live checkouts remain verifiable after a change.</p><p>Test keys: {testReady ? "Configured" : "Missing"}. Live keys: {liveReady ? "Configured" : "Missing"}.</p><p>For an access-sensitive change, sign in again and save within 15 minutes.</p></div><Switch name="acknowledgeLive" label="I understand Live accepts real payments" defaultChecked={false} note="Required when saving Live mode. Keys stay in the hosting environment." /></Panel></SettingsForm>;
}
