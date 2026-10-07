import { parseColours, suggestRoles } from "@/lib/brand-colours";

/**
 * The studio's suggested role for each colour in a client's answer, shown
 * under the answer in the admin. Computed from the saved lines every time it
 * is read: it is never written back, so the client's answer stays exactly as
 * they gave it. Plain text, so it works in the server-rendered entry page.
 */
export default function ColourRolesNote({ text }: { text: string }) {
  const rows = parseColours(text);
  if (!rows || !rows.length) return null;
  return (
    <div className="adForms__colourRoles">
      <p className="ad__dim">Suggested roles (worked out now, not saved)</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".35rem" }}>
        {suggestRoles(rows).map((row, index) => (
          <li key={`${row.name}-${index}`} style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
            <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid currentColor", background: row.hex || "transparent", flex: "none" }} />
            <span>{row.name}{row.hex ? <span className="ad__dim"> {row.hex}</span> : null}</span>
            <span className="ad__dim">{row.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
