"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
/* GSAP IS LOADED WHEN THE MENU IS FIRST WANTED, not with the page. It is about
   70 KB that every visitor used to download and parse on every page for a
   panel most of them never open. The panel rests off screen in CSS, so nothing
   needs the library until the first open; hovering or focusing the button
   starts the download early, so the first click does not wait. */
type Gsap = (typeof import("gsap"))["gsap"];
let gsapLoad: Promise<Gsap> | null = null;
const loadGsap = (): Promise<Gsap> => (gsapLoad ??= import("gsap").then((m) => m.gsap));
import type { FilmPage } from "./film-strip-menu";
import "./staggered-menu.css";

/* Loaded the first time it is wanted (or when the button is hovered or focused,
   which is a head start), so the reel's code and its six pictures cost phones
   and first paints nothing. */
const loadFilm = () => import("./film-strip-menu");
const FilmStripMenu = dynamic(loadFilm, { ssr: false });

/** Where the desktop menu starts. Below this the panel is the menu, as it always was. */
const FILM_QUERY = "(min-width: 768px)";

export interface MenuItem {
  label: string;
  ariaLabel: string;
  /** Drawn in the accent, with an arrow: a place outside the marketing site (the dashboard). */
  accent?: boolean;
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
  film,
  onMenuOpen,
  onMenuClose,
  onFilmChange,
}: {
  items?: MenuItem[];
  socialItems?: SocialItem[];
  displaySocials?: boolean;
  className?: string;
  footerSlot?: React.ReactNode;
  /** Who is signed in, shown above the footer row when somebody is. */
  accountSlot?: React.ReactNode;
  /** The desktop menu: a film strip of the site's pages. Phones ignore it. */
  film?: { pages: FilmPage[]; extra: { label: string; link: string; ariaLabel: string } };
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  /** The film strip opened or closed, so the header can dress for the dark. */
  onFilmChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const preLayersRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const openTlRef = useRef<ReturnType<Gsap["timeline"]> | null>(null);
  const closeTweenRef = useRef<ReturnType<Gsap["to"]> | null>(null);
  const gsapRef = useRef<Gsap | null>(null);
  const busyRef = useRef(false);

  /* DESKTOP OR PHONE, decided in the browser. `wide` is false on the server and
     for the first paint, so a phone never so much as loads the film strip. */
  const [wide, setWide] = useState(false);
  const wideRef = useRef(false);
  const filmOn = wide && Boolean(film);
  const [filmMounted, setFilmMounted] = useState(false);
  /** Which menu the current opening is, so a resize cannot leave the other one stuck. */
  const openedAsFilm = useRef(false);
  /* The same two facts as state, because rendering reads them (a ref may not be). */
  const [filmActive, setFilmActive] = useState(false);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(FILM_QUERY);
    const update = () => {
      wideRef.current = mq.matches;
      setWide(mq.matches);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);


  const buildOpenTimeline = useCallback((gsap: Gsap) => {
    const panel = panelRef.current;
    const layers = preLayersRef.current
      ? Array.from(preLayersRef.current.querySelectorAll(".sm-prelayer"))
      : [];
    if (!panel) return null;

    /* The panel rests at translateX(100%) in CSS; hand that position to GSAP
       as a percentage so the timeline below starts from where it already is. */
    gsap.set([panel, ...layers], { xPercent: 100, x: 0 });
    openTlRef.current?.kill();
    closeTweenRef.current?.kill();
    closeTweenRef.current = null;

    const itemEls = Array.from(panel.querySelectorAll(".sm-panel-itemLabel"));
    const socialTitle = panel.querySelector(".sm-socials-title");
    const socialLinks = Array.from(panel.querySelectorAll(".sm-socials-link"));
    const footer = panel.querySelector(".sm-foot") ?? panel.querySelector(".sm-footer");

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
    void loadGsap().then((gsap) => {
      gsapRef.current = gsap;
      /* Closed again before the library arrived: nothing to play. */
      if (!openRef.current) { busyRef.current = false; return; }
      const tl = buildOpenTimeline(gsap);
      if (tl) {
        tl.eventCallback("onComplete", () => {
          busyRef.current = false;
        });
        tl.play(0);
      } else {
        busyRef.current = false;
      }
    }).catch(() => { busyRef.current = false; });
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    const panel = panelRef.current;
    const layers = preLayersRef.current
      ? Array.from(preLayersRef.current.querySelectorAll(".sm-prelayer"))
      : [];
    const gsap = gsapRef.current;
    if (!panel || !gsap) { busyRef.current = false; return; }
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
    /* Desktop: the film strip, which owns its own motion. The panel and its
       GSAP timeline are not touched, so it stays parked off screen. */
    if (target ? wideRef.current && Boolean(film) : openedAsFilm.current) {
      openRef.current = target;
      openedAsFilm.current = target;
      setOpen(target);
      setFilmActive(target);
      if (target) setFilmMounted(true);
      onFilmChange?.(target);
      return;
    }
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
  }, [film, playOpen, playClose, onMenuOpen, onMenuClose, onFilmChange]);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    if (openedAsFilm.current) {
      openedAsFilm.current = false;
      setFilmActive(false);
      onFilmChange?.(false);
      return;
    }
    onMenuClose?.();
    playClose();
  }, [playClose, onMenuClose, onFilmChange]);

  /* A window narrowed past the breakpoint while the strip is open: close it,
     rather than leave a dialog nobody can reach on a screen that has a panel. */
  useEffect(() => {
    if (!wide && openedAsFilm.current) closeMenu();
  }, [wide, closeMenu]);

  useEffect(() => {
    /* The panel's click-away is not the film strip's: its frames are "outside". */
    if (!open || openedAsFilm.current) return;
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
    <div className={`sm-scope ${open && filmActive ? "sm-scope--film " : ""}${className}`}>
      <button
        ref={toggleBtnRef}
        className="sm-toggle relative z-[60]"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={filmOn ? "film-menu" : "staggered-menu-panel"}
        onClick={(e) => {
          setOpenedByKeyboard(e.detail === 0);
          toggleMenu();
        }}
        onPointerEnter={() => { void loadGsap(); if (filmOn) void loadFilm(); }}
        onFocus={() => { void loadGsap(); if (filmOn) void loadFilm(); }}
        onTouchStart={() => void loadGsap()}
        type="button"
      >
        <span className="sm-burger" aria-hidden="true">
          <span className="sm-burger-line sm-burger-line--top" />
          <span className="sm-burger-line sm-burger-line--mid" />
          <span className="sm-burger-line sm-burger-line--bot" />
        </span>
      </button>

      {filmMounted && film ? (
        <FilmStripMenu
          open={open && filmActive}
          onClose={closeMenu}
          pages={film.pages}
          extra={film.extra}
          footerSlot={footerSlot}
          accountSlot={accountSlot}
          toggleRef={toggleBtnRef}
          openedByKeyboard={openedByKeyboard}
        />
      ) : null}

      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        <div className="sm-prelayer" style={{ background: "#FF6500" }} />
        <div className="sm-prelayer" style={{ background: "#000065" }} />
      </div>

      <aside
        id="staggered-menu-panel"
        ref={panelRef}
        className="sm-panel"
        data-open={open && !filmActive}
        aria-hidden={!open || filmActive}
      >
        <div className="sm-panel-inner">
          {/* The list, not the panel, is the nested scroller now, so this is
              where Lenis has to stand aside. */}
          <ul className="sm-panel-list" role="list" data-lenis-prevent>
            {items.map((it, idx) => (
              <li className="sm-panel-itemWrap" key={it.label + idx}>
                <a
                  className={`sm-panel-item${it.accent ? " sm-panel-item--accent" : ""}`}
                  href={it.link}
                  aria-label={it.ariaLabel}
                  onClick={closeMenu}
                >
                  <span className="sm-panel-itemLabel">{it.label}{it.accent ? <span className="sm-panel-itemArrow" aria-hidden="true">↗</span> : null}</span>
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
          {/* SIGNED IN, ONE FOOT: the look controls sit as two small icons
              on top of the account row, under a single rule, rather than as a
              second row of pills. Signed out there is no account row, and the
              two stay labelled pills. */}
          {accountSlot ? (
            <div className="sm-foot">
              {footerSlot && <div className="sm-footer sm-footer--icons">{footerSlot}</div>}
              {accountSlot}
            </div>
          ) : footerSlot ? <div className="sm-footer">{footerSlot}</div> : null}
        </div>
      </aside>
    </div>
  );
}
