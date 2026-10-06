import { FIELD_EXAMPLES, OPTION_HELP } from "@/lib/onboarding-help";

export function ChoiceLabel({ field, option }: { field: string; option: string }) {
  const help = OPTION_HELP[field]?.[option];
  return help ? <span className="obChoiceHelp"><span>{option}</span><small>{help}</small></span> : <>{option}</>;
}

export function BriefExample({ field }: { field: string }) {
  const example = FIELD_EXAMPLES[field];
  if (!example) return null;
  return <div className="obExample">
    <strong>{example.title}</strong>
    <svg viewBox="0 0 240 76" role="img" aria-label={`Illustration: ${example.title}`} fill="none" stroke="currentColor" strokeWidth="1.5">
      {example.picture === "identity" ? <><rect x="8" y="9" width="62" height="58" rx="5" /><text x="23" y="46" fill="currentColor" stroke="none" fontSize="24">Aa</text><rect x="88" y="9" width="62" height="58" rx="5" /><path d="M99 24h40M99 34h29M99 54h9m6 0h9m6 0h10" /><rect x="168" y="9" width="62" height="58" rx="5" /><path d="M178 22h40M178 32h40M178 42h27M178 52h40" /></>
        : example.picture === "search" ? <><rect x="15" y="14" width="210" height="48" rx="8" /><circle cx="39" cy="34" r="8" /><path d="m45 40 7 7M70 29h132M70 40h95M70 50h114" /></>
        : example.picture === "website" ? <><rect x="15" y="9" width="210" height="58" rx="5" /><path d="M15 24h210M27 17h4m5 0h4m5 0h4M28 36h52M28 46h75M129 35h80v23h-80z" /></>
        : example.picture === "app" ? <><rect x="18" y="5" width="40" height="66" rx="6" /><path d="M30 12h16M31 57h14M58 38h65m-8-7 8 7-8 7" /><rect x="142" y="15" width="74" height="46" rx="5" /><path d="M153 28h50M153 38h50M153 48h31" /></>
        : example.picture === "workflow" ? <><rect x="8" y="22" width="57" height="32" rx="5" /><rect x="92" y="22" width="57" height="32" rx="5" /><rect x="176" y="22" width="57" height="32" rx="5" /><path d="M66 38h24m-7-6 7 6-7 6M150 38h24m-7-6 7 6-7 6M20 32h30m-30 10h20M105 32h30m-30 10h20M188 32h30m-30 10h20" /></>
        : <><rect x="15" y="8" width="55" height="60" rx="5" /><path d="m23 44 13-14 8 8 11-13 7 19zM23 56h38" /><rect x="90" y="8" width="55" height="60" rx="5" /><path d="M102 25h30M102 35h30M102 45h18m-15 13h3m8 0h3m8 0h3" /><rect x="165" y="8" width="55" height="60" rx="5" /><path d="m184 25 19 13-19 13z" /></>}
    </svg>
    <ol>{example.steps.map((step) => <li key={step}>{step}</li>)}</ol>
    <p>{example.note}</p>
  </div>;
}
