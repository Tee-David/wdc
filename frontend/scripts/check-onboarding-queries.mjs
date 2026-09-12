import { pool } from "./cockroach-client.mjs";

const db = pool();
const id = "00000000-0000-0000-0000-000000000000";
const plans = [
  ["lookup draft", `EXPLAIN SELECT s.id, s.service, s.status, s.current_step, s.answers, s.email, t.expires_at
    FROM onboarding_resume_tokens AS t
    JOIN onboarding_submissions AS s ON s.id = t.submission_id
    WHERE t.token_hash = $1 AND t.revoked_at IS NULL AND t.expires_at > now() LIMIT 1`, ["0".repeat(64)]],
  ["update draft", `EXPLAIN UPDATE onboarding_submissions
    SET service = $2, current_step = $3, answers = $4::JSONB, email = COALESCE($5, email), updated_at = now()
    WHERE id = $1 AND status = 'in_progress' RETURNING email`, [id, "web", 1, "{}", null]],
  ["insert draft", `EXPLAIN INSERT INTO onboarding_submissions (service, current_step, answers, email)
    VALUES ($1, $2, $3::JSONB, $4) RETURNING id`, ["web", 0, "{}", null]],
  ["claim resume token", `EXPLAIN UPDATE onboarding_resume_tokens SET used_at = now()
    WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()`, ["0".repeat(64)]],
  ["submit draft", `EXPLAIN UPDATE onboarding_submissions SET service = $2, status = 'submitted', current_step = 4,
    answers = $3::JSONB, email = COALESCE($4, email), updated_at = now(), submitted_at = now()
    WHERE id = $1 AND status = 'in_progress' RETURNING id`, [id, "web", "{}", null]],
];

try {
  for (const [label, sql, values] of plans) {
    const result = await db.query(sql, values);
    console.log(`${label}: ${result.rows.length ? "planned" : "no plan"}`);
  }
} finally {
  await db.end();
}
