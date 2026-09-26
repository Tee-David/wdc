import type { ReactNode } from "react";
import { BodyImage } from "./body-image";
import { r2PublicBase } from "@/lib/r2";

const bucket = r2PublicBase();
import type { DocBlock, DocInline, RichDoc } from "@/lib/blog-doc";
import { inlineText } from "@/lib/blog-doc";

/**
 * An editor post, rendered as plain elements.
 *
 * Server-rendered and walked node by node, never `dangerouslySetInnerHTML`:
 * the document was rebuilt from a whitelist when it was saved (`cleanDoc`),
 * and React escapes every string here, so there is no path from the editor to
 * markup on the page. Headings get the same derived ids as block posts, so the
 * contents list points at them in the same way.
 */

export const headingId = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function Inline({ nodes }: { nodes?: DocInline[] }) {
  return (
    <>
      {(nodes ?? []).map((n, i) => {
        if (n.type === "hardBreak") return <br key={i} />;
        let out: ReactNode = n.text;
        for (const m of n.marks ?? []) {
          if (m.type === "bold") out = <strong>{out}</strong>;
          else if (m.type === "italic") out = <em>{out}</em>;
        }
        const link = n.marks?.find((m) => m.type === "link");
        if (link && link.type === "link") {
          const external = /^(https?:)?\/\//.test(link.attrs.href);
          out = <a href={link.attrs.href} {...(external ? { rel: "noopener noreferrer" } : {})}>{out}</a>;
        }
        return <span key={i}>{out}</span>;
      })}
    </>
  );
}

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "heading": {
      const id = headingId(inlineText(block.content));
      return block.attrs.level === 3
        ? <h3 id={id}><Inline nodes={block.content} /></h3>
        : <h2 id={id}><Inline nodes={block.content} /></h2>;
    }
    case "bulletList": case "orderedList": {
      const items = block.content.map((li, i) => (
        <li key={i}>{li.content.map((b, j) => <Block key={j} block={b} />)}</li>
      ));
      return block.type === "orderedList" ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "blockquote":
      return <blockquote>{block.content.map((b, i) => <Block key={i} block={b} />)}</blockquote>;
    case "image": {
      const { src, alt, width, height } = block.attrs;
      /* OPTIMISED WHEN WE CAN BE: a picture from this site or our own bucket,
         with its size recorded at upload, goes through the image optimiser
         (resized to the reader's screen, AVIF or WebP, quality 85 so text in
         a screenshot stays crisp). Anything else stays a plain img. */
      const ours = src.startsWith("/") || Boolean(bucket && src.startsWith(`${bucket}/`));
      return (
        <figure className="bl-figure">
          {ours && width && height ? (
            <BodyImage src={src} alt={alt} width={width} height={height} />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
          )}
        </figure>
      );
    }
    case "video":
      return (
        <figure className="bl-figure">
          {/* Plays only when asked: no autoplay, metadata only until then,
              and inline on a phone rather than taking over the screen. */}
          <video src={block.attrs.src} controls playsInline preload="metadata"
            width={block.attrs.width} height={block.attrs.height} title={block.attrs.title || undefined}
            aria-label={block.attrs.title || "Video"} />
          {block.attrs.title ? <figcaption className="bl-figcap">{block.attrs.title}</figcaption> : null}
        </figure>
      );
    default:
      return <p><Inline nodes={block.content} /></p>;
  }
}

export function RichBody({ doc }: { doc: RichDoc }) {
  return <>{doc.content.map((b, i) => <Block key={`${b.type}-${i}`} block={b} />)}</>;
}
