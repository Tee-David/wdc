"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A picture in a post, through the image optimiser, WITH A WAY BACK.
 *
 * An upload lives in our R2 bucket and is only optimised if the optimiser
 * will fetch it: the bucket's host has to be in `remotePatterns` when the
 * site was BUILT, and the host's image quota has to have room. Either one
 * failing turned a picture that showed in the editor (which loads the
 * bucket directly) into an empty box on the post. If the optimised copy
 * fails, the bucket's own address is used instead: heavier, but there.
 */
export function BodyImage({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  const [direct, setDirect] = useState(false);
  return direct ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
  ) : (
    <Image src={src} alt={alt} width={width} height={height} quality={85}
      sizes="(max-width: 760px) 100vw, 720px" onError={() => setDirect(true)} />
  );
}
