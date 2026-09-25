"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import "./staggered-menu.css";

export interface MenuItem {
  label: string;
  ariaLabel: string;
  link: string;
}

export interface SocialItem {
  label: string;
  link: string;
  icon?: React.ReactNode;
}

/**
 * GSAP staggered slide-in menu (react-bits), reworked so the toggle button
 * renders inline (place it inside any header) while the panel and its
 * colored pre-layers animate in from the right edge of the viewport. The
 * toggle is an animated hamburger that morphs to an X; the panel bottom
 * hosts icon socials and an optional footer slot (e.g. the theme toggler),
 * both of which stay put while the list scrolls behind them.
 */
export default function StaggeredMenu({
  items = [],
  socialItems = [],
  displaySocials = true,
  className = "",
  footerSlot,
  accountSlot,
  onMenuOpen,
  onMenuClose,
}: {
  items?: MenuItem[];
  socialItems?: SocialItem[];
  displaySocials?: boolean;
  className?: string;
  footerSlot?: React.ReactNode;
  /** Who is signed in, shown above the footer row when somebody is. */
  accountSlot?: React.ReactNode;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const preLayersRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const busyRef = useRef(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const layers = preLayersRef.current
        ? Array.from(preLayersRef.current.querySelectorAll(".sm-prelayer"))
        : [];
      if (!panel) return;
      gsap.set([panel, ...layers], { xPercent: 100 });
    });
    return () => ctx.revert();
  }, []);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayersRef.current
      ? Array.from(preLayersRef.current.querySelectorAll(".sm-prelayer"))
      : [];
    if (!panel) return null;

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    closeTweenRef.current = null;

    const itemEls = Array.from(panel.querySelectorAll(".sm-panel-itemLabel"));
    const socialTitle = panel.querySelector(".sm-socials-title");
    const socialLinks = Array.from(panel.querySelectorAll(".sm-socials-link"));
    const footer = panel.querySelector(".sm-footer");

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
    if (footer) gsap.set(footer, { y: 20, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    layers.forEach((el, i) => {
      tl.fromTo(
        el,
        { xPercent: 100 },
        { xPercent: 0, duration: 0.5, ease: "power4.out" },
        i * 0.07
      );
    });
    const lastTime = layers.length ? (layers.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layers.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(
      panel,
      { xPercent: 100 },
      { xPercent: 0, duration: panelDuration, ease: "power4.out" },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: "power4.out",
          stagger: { each: 0.1, from: "start" },
        },
        itemsStart
      );
    }

    if (socialTitle || socialLinks.length || footer) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle)
        tl.to(
          socialTitle,
          { opacity: 1, duration: 0.5, ease: "power2.out" },
          socialsStart
        );
      if (socialLinks.length)
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: { each: 0.08, from: "start" },
          },
          socialsStart + 0.04
        );
      if (footer)
        tl.to(
          footer,
          { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" },
          socialsStart + 0.12
        );
    }

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback("onComplete", () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    const panel = panelRef.current;
    const layers = preLayersRef.current
      ? Array.from(preLayersRef.current.querySelectorAll(".sm-prelayer"))
      : [];
    if (!panel) return;
    closeTweenRef.current?.kill();
    closeTweenRef.current = gsap.to([...layers, panel], {
      xPercent: 100,
      duration: 0.32,
      ease: "power3.in",
      overwrite: "auto",
      onComplete: () => {
        busyRef.current = false;
      },
    });
  }, []);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
  }, [playOpen, playClose, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    onMenuClose?.();
    playClose();
  }, [playClose, onMenuClose]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, closeMenu]);

  return (
    <div className={`sm-scope ${className}`}>
      <button
        ref={toggleBtnRef}
        className="sm-toggle relative z-[60]"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="staggered-menu-panel"
        onClick={toggleMenu}
        type="button"
      >
        <span className="sm-burger" aria-hidden="true">
          <span className="sm-burger-line sm-burger-line--top" />
          <span className="sm-burger-line sm-burger-line--mid" />
          <span className="sm-burger-line sm-burger-line--bot" />
        </span>
      </button>

      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        <div className="sm-prelayer" style={{ background: "#FF6500" }} />
        <div className="sm-prelayer" style={{ background: "#000065" }} />
      </div>

      <aside
        id="staggered-menu-panel"
        ref={panelRef}
        className="sm-panel"
        data-open={open}
        aria-hidden={!open}
      >
        <div className="sm-panel-inner">
          {/* The list, not the panel, is the nested scroller now, so this is
              where Lenis has to stand aside. */}
          <ul className="sm-panel-list" role="list" data-lenis-prevent>
            {items.map((it, idx) => (
              <li className="sm-panel-itemWrap" key={it.label + idx}>
                <a
                  className="sm-panel-item"
                  href={it.link}
                  aria-label={it.ariaLabel}
                  onClick={closeMenu}
                >
                  <span className="sm-panel-itemLabel">{it.label}</span>
                </a>
              </li>
            ))}
          </ul>
          {displaySocials && socialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list" role="list">
                {socialItems.map((s, i) => (
                  <li key={s.label + i}>
                    <a
                      href={s.link}
                      target={s.link.startsWith("http") ? "_blank" : undefined}
                      rel={
                        s.link.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="sm-socials-link"
                      aria-label={s.label}
                      title={s.label}
                    >
                      {s.icon ?? s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {accountSlot}
          {footerSlot && <div className="sm-footer">{footerSlot}</div>}
        </div>
      </aside>
    </div>
  );
}
