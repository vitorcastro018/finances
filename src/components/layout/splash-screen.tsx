"use client";

import { useEffect, useState } from "react";

const SPLASH_DURATION_MS = 3300;

/** Coin & sprout intro animation, shown once right after login. */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setVisible(false), reducedMotion ? 0 : SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="splash-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background"
      aria-hidden="true"
    >
      <svg width={96} height={96} viewBox="0 0 64 64">
        <g className="splash-coin">
          <circle cx={32} cy={40} r={16} fill="#e8b75c" />
          <circle cx={32} cy={40} r={12} fill="none" stroke="#3a2f14" strokeWidth={1.5} opacity={0.35} />
          <line x1={23} y1={40} x2={41} y2={40} stroke="#3a2f14" strokeWidth={2} opacity={0.5} />
        </g>
        <line
          className="splash-stem"
          x1={32}
          y1={24}
          x2={32}
          y2={10}
          stroke="#34c795"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <g transform="rotate(-28 25 14)">
          <g className="splash-leaf-left">
            <ellipse cx={25} cy={14} rx={7.5} ry={3.5} fill="#34c795" />
            <line x1={17.5} y1={14} x2={32.5} y2={14} stroke="#16332a" strokeWidth={1} opacity={0.4} />
          </g>
        </g>
        <g transform="rotate(28 39 14)">
          <g className="splash-leaf-right">
            <ellipse cx={39} cy={14} rx={7.5} ry={3.5} fill="#34c795" />
            <line x1={31.5} y1={14} x2={46.5} y2={14} stroke="#16332a" strokeWidth={1} opacity={0.4} />
          </g>
        </g>
      </svg>
      <span className="splash-word text-xl font-semibold text-foreground">Finances</span>
    </div>
  );
}
