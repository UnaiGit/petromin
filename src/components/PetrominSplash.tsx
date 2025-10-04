import { useEffect, useRef, useState } from "react";
import "./PetrominSplash.css";

type PetrominSplashProps = {
  onRevealApp: () => void;
  onFinish: () => void;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function PetrominSplash({ onRevealApp, onFinish }: PetrominSplashProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const frameRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const fadeTriggeredRef = useRef(false);
  const loadingActiveRef = useRef(false);
  const [isFading, setIsFading] = useState(false);
  const [loadingBarActive, setLoadingBarActive] = useState(false);

  useEffect(() => {
    const pathEl = pathRef.current;
    const dotEl = dotRef.current;
    const wordmarkEl = wordmarkRef.current;

    if (!pathEl || !dotEl || !wordmarkEl) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pathLength = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = `${pathLength}`;
    pathEl.style.strokeDashoffset = `${pathLength}`;

    const initialDotPoint = pathEl.getPointAtLength(0);
    dotEl.setAttribute("cx", initialDotPoint.x.toString());
    dotEl.setAttribute("cy", initialDotPoint.y.toString());
    dotEl.style.opacity = "1";

    wordmarkEl.style.opacity = "0";
    wordmarkEl.style.letterSpacing = "0.2em";

    const endPoint = pathEl.getPointAtLength(pathLength);

    const clearTimers = () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (finishTimeoutRef.current !== null) {
        window.clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };

    const startRevealSequence = (delay: number) => {
      if (fadeTriggeredRef.current) {
        return;
      }
      fadeTriggeredRef.current = true;
      clearTimers();
      fadeTimeoutRef.current = window.setTimeout(() => {
        setIsFading(true);
        onRevealApp();
        finishTimeoutRef.current = window.setTimeout(() => {
          onFinish();
          finishTimeoutRef.current = null;
        }, 420);
        fadeTimeoutRef.current = null;
      }, delay);
    };

    const totalDuration = 2500;
    const dotStart = 700;
    const dotDuration = 1200;
    const wordmarkStart = 1100;
    const wordmarkDuration = 600;
    const loadingBarStart = 1900;

    if (prefersReducedMotion) {
      pathEl.style.strokeDashoffset = "0";
      dotEl.setAttribute("cx", endPoint.x.toString());
      dotEl.setAttribute("cy", endPoint.y.toString());

      requestAnimationFrame(() => {
        wordmarkEl.style.opacity = "1";
        wordmarkEl.style.letterSpacing = "0em";
      });

      loadingActiveRef.current = true;
      setLoadingBarActive(true);

      startRevealSequence(400);
    } else {
      const start = performance.now();

      const step = (now: number) => {
        const elapsed = now - start;
        const clampedElapsed = Math.min(elapsed, totalDuration);

        if (clampedElapsed <= 700) {
          const progress = clampedElapsed / 700;
          const eased = easeOutCubic(progress);
          const dashOffset = pathLength * (1 - eased);
          pathEl.style.strokeDashoffset = `${dashOffset}`;
        } else {
          pathEl.style.strokeDashoffset = "0";
        }

        if (clampedElapsed >= dotStart) {
          const dotPhase = Math.min((clampedElapsed - dotStart) / dotDuration, 1);
          const easedDot = easeInOutCubic(dotPhase);
          const progress = Math.min(easedDot, 1);
          const targetLength = pathLength * progress;

          if (targetLength <= pathLength) {
            const point = pathEl.getPointAtLength(targetLength);
            dotEl.setAttribute("cx", point.x.toString());
            dotEl.setAttribute("cy", point.y.toString());
          }
        }

        if (clampedElapsed >= wordmarkStart) {
          const wordmarkPhase = Math.min((clampedElapsed - wordmarkStart) / wordmarkDuration, 1);
          const easedWordmark = easeOutCubic(wordmarkPhase);
          const opacity = easedWordmark;
          const letterSpacing = 0.2 - 0.2 * easedWordmark;
          wordmarkEl.style.opacity = opacity.toString();
          wordmarkEl.style.letterSpacing = `${letterSpacing}em`;
        }

        if (clampedElapsed >= loadingBarStart && !loadingActiveRef.current) {
          loadingActiveRef.current = true;
          setLoadingBarActive(true);
        }

        if (elapsed < totalDuration) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          pathEl.style.strokeDashoffset = "0";
          dotEl.setAttribute("cx", endPoint.x.toString());
          dotEl.setAttribute("cy", endPoint.y.toString());
          wordmarkEl.style.opacity = "1";
          wordmarkEl.style.letterSpacing = "0em";
          startRevealSequence(0);
          frameRef.current = null;
        }
      };

      frameRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      clearTimers();
    };
  }, [onRevealApp, onFinish]);

  return (
    <div
      className={`petromin-splash${isFading ? " petromin-splash--fade" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="PETROMIN loading"
    >
      <div
        className={`petromin-splash__card${loadingBarActive ? " petromin-splash__card--loading" : ""}`}
      >
        <div className="petromin-splash__logo">
          <svg viewBox="0 0 320 320" className="petromin-splash__icon" aria-hidden="true">
            <path
              ref={pathRef}
              d="M142 284 Q112 284 112 254 L112 86 Q112 46 152 46 L226 46 Q284 46 284 108 Q284 168 228 180 Q200 186 188 204 Q180 216 180 236 L180 254 Q180 284 142 284"
              stroke="var(--petromin-blue)"
              strokeWidth="24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle ref={dotRef} className="petromin-splash__dot" r="12" fill="var(--color-accent)" />
          </svg>
          <h1 ref={wordmarkRef} className="petromin-wordmark">
            <span className="petromin-wordmark__petro">PETRO</span>
            <span className="petromin-wordmark__min">MIN</span>
          </h1>
        </div>
      </div>
    </div>
  );
}
