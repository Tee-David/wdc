"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
} from "react";

interface TextTypeProps {
  text: string | string[];
  as?: ElementType;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  className?: string;
  showCursor?: boolean;
  hideCursorWhileTyping?: boolean;
  cursorCharacter?: string;
  cursorClassName?: string;
  cursorBlinkDuration?: number;
  textColors?: string[];
  variableSpeed?: { min: number; max: number };
  onSentenceComplete?: (sentence: string, index: number) => void;
  startOnVisible?: boolean;
  /**
   * Render the FIRST phrase already complete, then carry on cycling from
   * there.
   *
   * WHY IT EXISTS. Used inside a heading, this component types from an empty
   * string, so the heading's painted width grows for several seconds after the
   * page is ready. Largest Contentful Paint takes the last of those growths:
   * measured on the homepage, the hero H1 was reporting an LCP of 4.4s on
   * emulated mobile, with the page otherwise complete at 1.1s. Nothing was
   * slow -- the headline simply had not finished saying itself.
   *
   * It is also better to read. The first thing a visitor sees is the sentence,
   * not a cursor working towards it.
   */
  startFull?: boolean;
  /**
   * Hold the width of the longest phrase from the first frame, so the line
   * does not reflow on every character and the text beside it stays put.
   */
  reserveWidth?: boolean;
}

export default function TextType({
  text,
  as: Component = "span",
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = "",
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = "|",
  cursorClassName = "",
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  startFull = false,
  reserveWidth = false,
}: TextTypeProps) {
  const first = Array.isArray(text) ? (text[0] ?? "") : text;
  /* Lazy initialisers, so the complete phrase is in the very first render
     rather than arriving in an effect a frame later -- which would put the
     paint back where it started. */
  const [displayedText, setDisplayedText] = useState(() => (startFull ? first : ""));
  const [currentCharIndex, setCurrentCharIndex] = useState(() =>
    startFull ? first.length : 0,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const containerRef = useRef<HTMLElement>(null);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const currentColor =
    textColors.length === 0
      ? "inherit"
      : textColors[currentTextIndex % textColors.length];

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsVisible(true);
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let timeout: ReturnType<typeof setTimeout>;
    const currentText = textArray[currentTextIndex];

    const executeTypingAnimation = () => {
      if (isDeleting) {
        if (displayedText === "") {
          setIsDeleting(false);
          if (currentTextIndex === textArray.length - 1 && !loop) return;
          onSentenceComplete?.(textArray[currentTextIndex], currentTextIndex);
          setCurrentTextIndex((prev) => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
        } else {
          timeout = setTimeout(() => {
            setDisplayedText((prev) => prev.slice(0, -1));
          }, deletingSpeed);
        }
      } else {
        if (currentCharIndex < currentText.length) {
          timeout = setTimeout(
            () => {
              setDisplayedText((prev) => prev + currentText[currentCharIndex]);
              setCurrentCharIndex((prev) => prev + 1);
            },
            variableSpeed ? getRandomSpeed() : typingSpeed
          );
        } else if (textArray.length >= 1) {
          if (!loop && currentTextIndex === textArray.length - 1) return;
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, pauseDuration);
        }
      }
    };

    if (currentCharIndex === 0 && !isDeleting && displayedText === "") {
      timeout = setTimeout(executeTypingAnimation, initialDelay);
    } else {
      executeTypingAnimation();
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    variableSpeed,
    onSentenceComplete,
  ]);

  const shouldHideCursor =
    hideCursorWhileTyping &&
    (currentCharIndex < textArray[currentTextIndex].length || isDeleting);

  return (
    <Component
      ref={containerRef}
      className={`text-type ${className}`}
      style={reserveWidth ? { display: "inline-grid" } : undefined}
    >
      {/* The sizer. Laid out, never painted, never announced: it holds the
          width of the longest phrase so the line does not reflow on every
          character. It shares one grid cell with the live text, so the wider of
          the two decides the width -- which is always this one. */}
      {reserveWidth && (
        <span
          aria-hidden="true"
          style={{ gridArea: "1 / 1", visibility: "hidden", whiteSpace: "pre" }}
        >
          {textArray.reduce((a, b) => (b.length > a.length ? b : a), "")}
        </span>
      )}
      {/* `justify-self: center` IS LOAD-BEARING, and the reason is Largest
          Contentful Paint rather than typography.

          A grid item stretches to its cell by default. With the cell as wide as
          the longest phrase, the live text and the cursor were each getting a
          box that wide however few characters were in them -- and LCP measures
          the BOX. Measured on the homepage: the cursor reported 6,298px2 and
          the typing text 20,580px2, which made a blinking caret and a
          half-typed word the largest things on the page, re-firing LCP on
          every character. The heading they sit in had painted at 296ms; LCP
          was reporting 5.4s.

          Shrink-wrapping them and centring them in the reserved cell keeps the
          line from reflowing -- the whole point of `reserveWidth` -- while the
          boxes stay the size of the words actually in them. */}
      <span
        style={
          reserveWidth
            ? { gridArea: "1 / 1", justifySelf: "center", whiteSpace: "pre" }
            : undefined
        }
      >
        <span className="text-type__content" style={{ color: currentColor }}>
          {displayedText}
        </span>
        {showCursor && (
        /* aria-hidden, because the cursor is a drawing and not a word. This
           sits inside the homepage h1, so without it a screen reader announces
           the heading and then reads the cursor glyph out as part of it --
           "We make your business unmissable. Left half block". */
        <span
          aria-hidden="true"
          className={`text-type__cursor ${cursorClassName} ${
            shouldHideCursor ? "text-type__cursor--hidden" : ""
          }`}
          style={{ animationDuration: `${cursorBlinkDuration}s` }}
        >
          {cursorCharacter}
        </span>
        )}
      </span>
    </Component>
  );
}
