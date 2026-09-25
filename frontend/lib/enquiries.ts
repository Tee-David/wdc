import "server-only";

import { db } from "@/lib/db/pool";
import { assignSerial } from "@/lib/forms/serial";

/**
 * Stored contact enquiries. See db/migrations/0007_contact_enquiries.sql for
 * why the row is written before any mail is sent.
 */

export type Enquiry = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  topic: string;
  message: string;
  delivery: "pending" | "sent" | "failed";
  deliveryError: string | null;
  createdAt: string;
};

export function enquiriesAreConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
}

export async function saveEnquiry(input: {
  firstName: string; lastName: string; email: string; phone: string; topic: string; message: string;
}): Promise<string> {
  const result = await db.query<{ id: string }>(`
    INSERT INTO contact_enquiries (first_name, last_name, email, phone, topic, message)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [input.firstName, input.lastName, input.email, input.phone || null, input.topic, input.message]);
  const id = result.rows[0].id;
  /* "Enquiry #7". */
  await assignSerial("contact_enquiries", "contact", id);
  return id;
}

/** pending -> sent or failed. Written once, by the send behind the response. */
export async function settleEnquiry(id: string, delivery: "sent" | "failed", error?: string) {
  await db.query(`
    UPDATE contact_enquiries
    SET delivery = $2, delivery_error = $3, delivered_at = now()
    WHERE id = $1 AND delivery = 'pending'
  `, [id, delivery, error?.slice(0, 300) ?? null]);
}

type Row = {
  id: string; first_name: string; last_name: string; email: string; phone: string | null;
  topic: string; message: string; delivery: Enquiry["delivery"]; delivery_error: string | null;
  created_at: Date;
};

/** Newest first. Bounded, because this is read on the dashboard. */
export async function recentEnquiries(limit = 5): Promise<Enquiry[]> {
  const result = await db.query<Row>(`
    SELECT id, first_name, last_name, email, phone, topic, message, delivery, delivery_error, created_at
    FROM contact_enquiries
    ORDER BY created_at DESC, id DESC
    LIMIT $1
  `, [Math.min(Math.max(limit, 1), 50)]);
  return result.rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    message: row.message,
    delivery: row.delivery,
    deliveryError: row.delivery_error,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
