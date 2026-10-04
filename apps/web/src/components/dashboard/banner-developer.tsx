"use client";

import { motion, useReducedMotion } from "framer-motion";

export function BannerDeveloper({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={["relative mx-auto w-[200px] xl:w-[230px]", className].join(" ")}
      aria-hidden
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
      animate={
        reduceMotion
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 1, y: [0, -8, 0], scale: 1 }
      }
      transition={
        reduceMotion
          ? { duration: 0.35 }
          : {
              opacity: { duration: 0.45 },
              scale: { duration: 0.45 },
              y: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
            }
      }
    >
      <svg viewBox="0 0 200 220" className="h-auto w-full overflow-visible" role="img">
        <title>Developer with a laptop</title>

        {/* soft ground glow only - no solid background */}
        <ellipse cx="100" cy="208" rx="54" ry="8" fill="rgb(255 255 255 / 0.18)" />

        {/* legs / seat */}
        <path
          d="M52 148c8 18 28 34 48 34s40-16 48-34c-14 8-30 12-48 12s-34-4-48-12Z"
          fill="#1e293b"
        />
        <path d="M58 168c6 10 14 16 22 18-8-8-14-16-18-26l-4 8Z" fill="#0f172a" />
        <path d="M142 168c-6 10-14 16-22 18 8-8 14-16 18-26l4 8Z" fill="#0f172a" />

        {/* sneakers */}
        <path d="M48 178c8 4 18 4 24-1l2 6c-10 6-22 6-30 1l4-6Z" fill="#f8fafc" />
        <path d="M152 178c-8 4-18 4-24-1l-2 6c10 6 22 6 30 1l-4-6Z" fill="#f8fafc" />

        {/* torso / hoodie */}
        <path
          d="M68 88c4-18 16-30 32-30s28 12 32 30l8 52c-12 10-28 16-40 16s-28-6-40-16l8-52Z"
          fill="#003A9E"
        />
        <path d="M88 62c4-6 10-10 12-10s8 4 12 10l4 10H84l4-10Z" fill="#004CC8" />
        <path d="M94 70v18M106 70v18" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />

        {/* arms */}
        <path
          d="M68 98c-14 10-22 28-20 42 8-4 16-6 24-6l-4-36Z"
          fill="#003A9E"
        />
        <path
          d="M132 98c14 10 22 28 20 42-8-4-16-6-24-6l4-36Z"
          fill="#003A9E"
        />

        {/* hands */}
        <ellipse cx="74" cy="142" rx="8" ry="6" fill="#f0c7a8" />
        <ellipse cx="126" cy="142" rx="8" ry="6" fill="#f0c7a8" />

        {/* laptop */}
        <g>
          <rect x="62" y="128" width="76" height="48" rx="4" fill="#cbd5e1" />
          <rect x="68" y="134" width="64" height="36" rx="2" fill="#0f172a" />
          {/* animated code lines */}
          <motion.rect
            x="74"
            y="142"
            width="28"
            height="3"
            rx="1.5"
            fill="#5B9BFF"
            animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.rect
            x="74"
            y="149"
            width="40"
            height="3"
            rx="1.5"
            fill="#94a3b8"
            animate={reduceMotion ? undefined : { opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
          <motion.rect
            x="74"
            y="156"
            width="22"
            height="3"
            rx="1.5"
            fill="#004CC8"
            animate={reduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
          />
          <path d="M58 176h84l-6 8H64l-6-8Z" fill="#94a3b8" />
        </g>

        {/* head */}
        <circle cx="100" cy="48" r="26" fill="#f0c7a8" />
        {/* hair */}
        <path
          d="M76 48c2-22 16-34 24-34s22 12 24 34c-6-10-14-14-24-14s-18 4-24 14Z"
          fill="#111827"
        />
        <path d="M74 52c0-8 4-14 8-18-8 6-10 14-8 22" fill="#111827" />
        {/* face */}
        <circle cx="91" cy="50" r="2.2" fill="#111827" />
        <circle cx="109" cy="50" r="2.2" fill="#111827" />
        <path
          d="M94 60c2.5 3 9.5 3 12 0"
          fill="none"
          stroke="#b45309"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* floating accent chips */}
        <motion.g
          animate={reduceMotion ? undefined : { y: [0, -6, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        >
          <rect x="156" y="56" width="28" height="18" rx="6" fill="rgb(255 255 255 / 0.92)" />
          <text
            x="170"
            y="68"
            textAnchor="middle"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fill="#004CC8"
            fontWeight="700"
          >
            {"</>"}
          </text>
        </motion.g>
        <motion.g
          animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <circle cx="34" cy="78" r="12" fill="rgb(255 255 255 / 0.9)" />
          <path
            d="M30 78h8M34 74v8"
            stroke="#004CC8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </motion.g>
      </svg>
    </motion.div>
  );
}
