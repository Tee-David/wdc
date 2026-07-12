import {
  siAppstore,
  siBlender,
  siBuffer,
  siClaude,
  siCockroachlabs,
  siCoreldraw,
  siCss,
  siDart,
  siDocker,
  siExpress,
  siFacebook,
  siFigma,
  siFlutter,
  siFramer,
  siGit,
  siGithub,
  siGo,
  siGoogle,
  siGoogleanalytics,
  siGooglecloud,
  siGooglegemini,
  siGooglemeet,
  siGoogleplay,
  siGooglesearchconsole,
  siGraphql,
  siGsap,
  siHootsuite,
  siHtml5,
  siHubspot,
  siHuggingface,
  siInstagram,
  siJavascript,
  siKotlin,
  siLighthouse,
  siMailchimp,
  siMeta,
  siMongodb,
  siMysql,
  siNextdotjs,
  siNodedotjs,
  siPagespeedinsights,
  siPhp,
  siPostgresql,
  siPostman,
  siPython,
  siReact,
  siRedis,
  siRust,
  siSemrush,
  siSharp,
  siSwift,
  siTailwindcss,
  siTiktok,
  siTypescript,
  siVercel,
  siWhatsapp,
  siWordpress,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

export type LogoCategory =
  | "design"
  | "seo"
  | "web"
  | "database"
  | "cloud"
  | "mobile"
  | "ai"
  | "social";

export type LogoEntry = {
  id: string;
  name: string;
  category: LogoCategory;
} & (
  | { kind: "si"; icon: SimpleIcon }
  | { kind: "badge"; label: string; fg: string; bg: string }
);

const si = (
  id: string,
  name: string,
  category: LogoCategory,
  icon: SimpleIcon
): LogoEntry => ({ kind: "si", id, name, category, icon });

const badge = (
  id: string,
  name: string,
  category: LogoCategory,
  label: string,
  fg: string,
  bg: string
): LogoEntry => ({ kind: "badge", id, name, category, label, fg, bg });

/**
 * The full WDC toolbox. simple-icons where available; branded monogram
 * badges (official colors) for marks removed from simple-icons on
 * trademark grounds (Adobe, Canva, LinkedIn, OpenAI, AWS, Azure, Oracle…).
 */
export const LOGOS: LogoEntry[] = [
  // Branding & Design
  badge("photoshop", "Adobe Photoshop", "design", "Ps", "#31A8FF", "#001E36"),
  badge("illustrator", "Adobe Illustrator", "design", "Ai", "#FF9A00", "#330000"),
  badge("indesign", "Adobe InDesign", "design", "Id", "#FF3366", "#49021F"),
  badge("aftereffects", "Adobe After Effects", "design", "Ae", "#9999FF", "#00005B"),
  si("coreldraw", "CorelDRAW", "design", siCoreldraw),
  badge("canva", "Canva", "design", "Ca", "#ffffff", "#00C4CC"),
  si("figma", "Figma", "design", siFigma),
  si("blender", "Blender", "design", siBlender),
  si("framer", "Framer", "design", siFramer),

  // SEO
  si("semrush", "Semrush", "seo", siSemrush),
  badge("ahrefs", "Ahrefs", "seo", "Ah", "#ffffff", "#054ADA"),
  badge("seranking", "SE Ranking", "seo", "SE", "#ffffff", "#2E5BFF"),
  si("searchconsole", "Google Search Console", "seo", siGooglesearchconsole),
  si("analytics", "Google Analytics", "seo", siGoogleanalytics),
  si("pagespeed", "PageSpeed Insights", "seo", siPagespeedinsights),
  si("lighthouse", "Lighthouse", "seo", siLighthouse),
  si("google", "Google", "seo", siGoogle),

  // Web Development
  si("html5", "HTML5", "web", siHtml5),
  si("css", "CSS", "web", siCss),
  si("javascript", "JavaScript", "web", siJavascript),
  si("typescript", "TypeScript", "web", siTypescript),
  si("react", "React", "web", siReact),
  si("nextjs", "Next.js", "web", siNextdotjs),
  si("nodejs", "Node.js", "web", siNodedotjs),
  si("express", "Express", "web", siExpress),
  si("php", "PHP", "web", siPhp),
  si("python", "Python", "web", siPython),
  si("wordpress", "WordPress", "web", siWordpress),
  si("tailwind", "Tailwind CSS", "web", siTailwindcss),
  si("graphql", "GraphQL", "web", siGraphql),
  si("gsap", "GSAP", "web", siGsap),

  // Databases
  si("mongodb", "MongoDB", "database", siMongodb),
  si("postgresql", "PostgreSQL", "database", siPostgresql),
  si("mysql", "MySQL", "database", siMysql),
  si("cockroachdb", "CockroachDB", "database", siCockroachlabs),
  si("redis", "Redis", "database", siRedis),

  // Cloud & DevOps
  si("googlecloud", "Google Cloud", "cloud", siGooglecloud),
  badge("azure", "Microsoft Azure", "cloud", "Az", "#ffffff", "#0078D4"),
  badge("aws", "AWS", "cloud", "AWS", "#FF9900", "#232F3E"),
  badge("oracle", "Oracle Cloud", "cloud", "O", "#ffffff", "#C74634"),
  si("vercel", "Vercel", "cloud", siVercel),
  si("docker", "Docker", "cloud", siDocker),
  si("git", "Git", "cloud", siGit),
  si("github", "GitHub", "cloud", siGithub),

  // Cross-Platform Apps
  si("flutter", "Flutter", "mobile", siFlutter),
  si("dart", "Dart", "mobile", siDart),
  si("swift", "Swift", "mobile", siSwift),
  si("kotlin", "Kotlin", "mobile", siKotlin),
  badge("csharp", "C#", "mobile", "C#", "#ffffff", "#512BD4"),
  si("appstore", "App Store", "mobile", siAppstore),
  si("googleplay", "Google Play", "mobile", siGoogleplay),
  si("postman", "Postman", "mobile", siPostman),

  // AI & Software Engineering
  si("claude", "Claude by Anthropic", "ai", siClaude),
  badge("openai", "OpenAI", "ai", "AI", "#ffffff", "#0ea47f"),
  si("gemini", "Google Gemini", "ai", siGooglegemini),
  si("huggingface", "Hugging Face", "ai", siHuggingface),
  si("rust", "Rust", "ai", siRust),
  si("go", "Go", "ai", siGo),
  si("sharp", "C# / .NET", "ai", siSharp),

  // Social & Marketing
  si("meta", "Meta", "social", siMeta),
  si("facebook", "Facebook", "social", siFacebook),
  si("instagram", "Instagram", "social", siInstagram),
  si("x", "X (Twitter)", "social", siX),
  badge("linkedin", "LinkedIn", "social", "in", "#ffffff", "#0A66C2"),
  si("whatsapp", "WhatsApp", "social", siWhatsapp),
  si("tiktok", "TikTok", "social", siTiktok),
  si("youtube", "YouTube", "social", siYoutube),
  si("googlemeet", "Google Meet", "social", siGooglemeet),
  si("mailchimp", "Mailchimp", "social", siMailchimp),
  si("hubspot", "HubSpot", "social", siHubspot),
  si("hootsuite", "Hootsuite", "social", siHootsuite),
  si("buffer", "Buffer", "social", siBuffer),
];

/** Brand hex for an entry (simple-icons hex or badge background). */
export function logoHex(entry: LogoEntry): string {
  return entry.kind === "si" ? `#${entry.icon.hex}` : entry.bg;
}

/** The 20 logos used by the intro animation — one visual spread across all services. */
export const INTRO_LOGO_IDS = [
  "photoshop",
  "figma",
  "canva",
  "coreldraw",
  "semrush",
  "google",
  "react",
  "nextjs",
  "typescript",
  "nodejs",
  "wordpress",
  "mongodb",
  "postgresql",
  "googlecloud",
  "aws",
  "flutter",
  "swift",
  "claude",
  "openai",
  "meta",
] as const;

export const INTRO_LOGOS: LogoEntry[] = INTRO_LOGO_IDS.map(
  (id) => LOGOS.find((l) => l.id === id)!
);
