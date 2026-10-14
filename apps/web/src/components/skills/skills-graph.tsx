"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  SKILL_STATUS_LABELS,
  type SkillStatus,
} from "@coddle/shared";
import { SkillDetailPanel } from "@/components/skills/skill-detail-panel";
import { edgePath, layoutSkillGraph, type LaidOutNode } from "@/components/skills/skill-layout";
import type { SkillEdge, SkillGraph, SkillNode } from "@/lib/skills";

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;
/** Button +/- step. Wheel uses a smaller delta. */
const ZOOM_STEP = 0.12;
const WHEEL_ZOOM_STEP = 0.08;
const PINCH_ZOOM_STEP = 0.055;

const STATUS_FILL: Record<SkillStatus, string> = {
  locked: "var(--surface)",
  interested: "var(--brand-soft)",
  learning: "#FFF7ED",
  demonstrated: "var(--brand)",
  credentialed: "#0F766E",
};

const STATUS_STROKE: Record<SkillStatus, string> = {
  locked: "color-mix(in srgb, var(--ink-muted) 55%, transparent)",
  interested: "var(--brand)",
  learning: "#EA580C",
  demonstrated: "var(--brand-deep)",
  credentialed: "#134E4A",
};

const STATUS_TEXT: Record<SkillStatus, string> = {
  locked: "var(--ink-muted)",
  interested: "var(--brand-deep)",
  learning: "#9A3412",
  demonstrated: "#ffffff",
  credentialed: "#ffffff",
};

function neighborsOf(slug: string, edges: SkillEdge[]) {
  const set = new Set<string>([slug]);
  for (const edge of edges) {
    if (edge.from === slug) set.add(edge.to);
    if (edge.to === slug) set.add(edge.from);
  }
  return set;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-lg text-ink transition hover:bg-brand-soft hover:text-brand disabled:opacity-35";
  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-xl border border-ink/10 bg-surface/95 p-1 shadow-sm backdrop-blur">
      <button type="button" className={btn} onClick={onZoomOut} aria-label="Zoom out" disabled={zoom <= MIN_ZOOM}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <span className="min-w-[3.25rem] text-center font-mono text-[11px] font-semibold tabular-nums text-ink-muted">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" className={btn} onClick={onZoomIn} aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <div className="mx-0.5 h-5 w-px bg-ink/10" />
      <button type="button" className={`${btn} w-auto px-2.5 text-[11px] font-semibold`} onClick={onFit}>
        Fit
      </button>
      <button type="button" className={`${btn} w-auto px-2.5 text-[11px] font-semibold`} onClick={onReset}>
        Reset
      </button>
    </div>
  );
}

function SkillNodeShape({
  node,
  selected,
  dimmed,
  hovered,
  reduceMotion,
  index,
  onHover,
  onSelect,
}: {
  node: LaidOutNode;
  selected: boolean;
  dimmed: boolean;
  hovered: boolean;
  reduceMotion: boolean | null;
  index: number;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string) => void;
}) {
  const w = node.width;
  const h = node.height;
  const x = node.x - w / 2;
  const y = node.y - h / 2;
  const proven = node.status === "demonstrated" || node.status === "credentialed";

  return (
    <motion.g
      data-skill-node
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{
        opacity: dimmed ? 0.22 : 1,
        y: 0,
        scale: selected ? 1.04 : hovered ? 1.02 : 1,
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { delay: Math.min(index * 0.018, 0.35), type: "spring", stiffness: 360, damping: 26 }
      }
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover(node.slug)}
      onMouseLeave={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.slug);
      }}
    >
      {(selected || hovered) && (
        <rect
          x={x - 4}
          y={y - 4}
          width={w + 8}
          height={h + 8}
          rx={14}
          fill="none"
          stroke="var(--brand-light)"
          strokeWidth={selected ? 2 : 1.5}
          opacity={selected ? 0.9 : 0.55}
        />
      )}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        fill={STATUS_FILL[node.status]}
        stroke={STATUS_STROKE[node.status]}
        strokeWidth={node.status === "locked" ? 1.25 : 1.75}
        strokeDasharray={node.status === "locked" ? "5 3.5" : undefined}
        style={{
          filter:
            proven && !dimmed
              ? "drop-shadow(0 6px 14px color-mix(in srgb, var(--brand) 22%, transparent))"
              : undefined,
        }}
      />
      <circle
        cx={x + 16}
        cy={node.y}
        r={5}
        fill={
          node.status === "locked"
            ? "transparent"
            : node.status === "credentialed"
              ? "#5EEAD4"
              : node.status === "demonstrated"
                ? "var(--brand-light)"
                : node.status === "learning"
                  ? "#FB923C"
                  : "var(--brand)"
        }
        stroke={STATUS_STROKE[node.status]}
        strokeWidth={node.status === "locked" ? 1.25 : 0}
        strokeDasharray={node.status === "locked" ? "2 1.5" : undefined}
      />
      <text
        x={x + 28}
        y={node.y + 1}
        dominantBaseline="middle"
        fill={STATUS_TEXT[node.status]}
        fontSize={13}
        fontWeight={600}
        fontFamily="var(--font-sans, ui-sans-serif, system-ui, sans-serif)"
        style={{ pointerEvents: "none" }}
      >
        {node.name}
      </text>
      {node.status === "credentialed" && (
        <text
          x={x + w - 16}
          y={node.y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#99F6E4"
          fontSize={12}
          fontWeight={700}
          style={{ pointerEvents: "none" }}
        >
          ✓
        </text>
      )}
    </motion.g>
  );
}

export function SkillsGraph({
  graph,
  compact = false,
  initialSlug = null,
}: {
  graph: SkillGraph;
  compact?: boolean;
  initialSlug?: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const markerIdle = `skill-arrow-${uid}`;
  const markerActive = `skill-arrow-active-${uid}`;

  const [selected, setSelected] = useState<string | null>(initialSlug);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ w: 800, h: 480 });

  const layout = useMemo(
    () => layoutSkillGraph(graph.nodes, graph.edges),
    [graph.nodes, graph.edges],
  );

  const focus = hovered ?? selected;
  const focusSet = useMemo(
    () => (focus ? neighborsOf(focus, graph.edges) : null),
    [focus, graph.edges],
  );

  const selectedNode = selected
    ? graph.nodes.find((node) => node.slug === selected) ?? null
    : null;

  const prerequisites = useMemo(() => {
    if (!selected) return [] as SkillNode[];
    const slugs = graph.edges.filter((edge) => edge.to === selected).map((edge) => edge.from);
    return graph.nodes.filter((node) => slugs.includes(node.slug));
  }, [selected, graph.edges, graph.nodes]);

  const leadsTo = useMemo(() => {
    if (!selected) return [] as SkillNode[];
    const slugs = graph.edges.filter((edge) => edge.from === selected).map((edge) => edge.to);
    return graph.nodes.filter((node) => slugs.includes(node.slug));
  }, [selected, graph.edges, graph.nodes]);

  useEffect(() => {
    if (initialSlug) setSelected(initialSlug);
  }, [initialSlug]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitToView = useCallback(() => {
    const pad = 48;
    const scaleX = (viewportSize.w - pad * 2) / Math.max(layout.width, 1);
    const scaleY = (viewportSize.h - pad * 2) / Math.max(layout.height, 1);
    const next = clampZoom(Math.min(scaleX, scaleY, 1.15));
    setZoom(next);
    setPan({
      x: (viewportSize.w - layout.width * next) / 2,
      y: (viewportSize.h - layout.height * next) / 2,
    });
  }, [layout.height, layout.width, viewportSize.h, viewportSize.w]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({
      x: Math.max(24, (viewportSize.w - layout.width) / 2),
      y: Math.max(24, (viewportSize.h - layout.height) / 2),
    });
  }, [layout.height, layout.width, viewportSize.h, viewportSize.w]);

  const graphKey = `${graph.nodes.length}:${graph.edges.length}`;
  const lastGraphKey = useRef("");
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (viewportSize.w < 40) return;
    const graphChanged = lastGraphKey.current !== graphKey;
    if (!didInitialFit.current || graphChanged) {
      lastGraphKey.current = graphKey;
      didInitialFit.current = true;
      fitToView();
    }
  }, [fitToView, graphKey, viewportSize.w]);

  const zoomAt = useCallback(
    (nextZoom: number, originX: number, originY: number) => {
      setZoom((prev) => {
        const clamped = clampZoom(nextZoom);
        if (clamped === prev) return prev;
        const ratio = clamped / prev;
        setPan((p) => ({
          x: originX - (originX - p.x) * ratio,
          y: originY - (originY - p.y) * ratio,
        }));
        return clamped;
      });
    },
    [],
  );

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const ox = event.clientX - rect.left;
      const oy = event.clientY - rect.top;
      const direction = event.deltaY > 0 ? -1 : 1;
      // Normalize trackpad/mouse wheel so large deltas don't jump.
      const intensity = Math.min(1, Math.abs(event.deltaY) / 100);
      const base =
        event.ctrlKey || event.metaKey ? PINCH_ZOOM_STEP : WHEEL_ZOOM_STEP;
      zoomAt(zoomRef.current + direction * base * intensity, ox, oy);
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [zoomAt]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as Element).closest("[data-skill-node]")) return;
    if ((event.target as Element).closest("[data-zoom-controls]")) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    setPan({
      x: drag.current.panX + dx,
      y: drag.current.panY + dy,
    });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const wasDrag = drag.current?.moved;
    drag.current = null;
    // Click empty canvas clears selection (only if not a drag).
    if (!wasDrag && !(event.target as Element).closest("[data-skill-node]")) {
      // keep selection — clearer UX to dismiss via panel close
    }
  }

  const viewH = compact ? 380 : 560;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_1px_0_rgba(15,23,42,0.04)] ${
        compact ? "" : "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]"
      }`}
    >
      <div className="relative min-w-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-3 sm:p-4">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                "locked",
                "interested",
                "learning",
                "demonstrated",
                "credentialed",
              ] as SkillStatus[]
            ).map((status) => (
              <span
                key={status}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/8 bg-surface/90 px-2 py-1 text-[11px] font-medium text-ink-muted shadow-sm backdrop-blur"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[4px] border"
                  style={{
                    background: STATUS_FILL[status],
                    borderColor: STATUS_STROKE[status],
                    borderStyle: status === "locked" ? "dashed" : "solid",
                  }}
                />
                {SKILL_STATUS_LABELS[status]}
              </span>
            ))}
          </div>
        </div>

        <div
          ref={viewportRef}
          className="relative cursor-grab overflow-hidden active:cursor-grabbing"
          style={{
            height: viewH,
            backgroundColor: "var(--surface-subtle)",
            backgroundImage: `
              radial-gradient(ellipse 70% 55% at 50% 35%, color-mix(in srgb, var(--brand-soft) 70%, transparent), transparent 70%),
              radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--ink) 8%, transparent) 1px, transparent 0)
            `,
            backgroundSize: "auto, 22px 22px",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg
            width="100%"
            height="100%"
            className="select-none"
            role="img"
            aria-label="Interactive skill relationship graph"
          >
            <defs>
              <marker
                id={markerIdle}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.2 L 8.5 5 L 0 8.8 z" fill="var(--ink-muted)" opacity="0.45" />
              </marker>
              <marker
                id={markerActive}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.2 L 8.5 5 L 0 8.8 z" fill="var(--brand)" />
              </marker>
              <filter id={`node-shadow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.12" />
              </filter>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {graph.edges.map((edge) => {
                const from = layout.bySlug.get(edge.from);
                const to = layout.bySlug.get(edge.to);
                if (!from || !to) return null;
                const connected =
                  focusSet != null &&
                  focusSet.has(edge.from) &&
                  focusSet.has(edge.to) &&
                  (edge.from === focus || edge.to === focus);
                const dimmed = focusSet != null && !connected;
                return (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={edgePath(from, to)}
                    fill="none"
                    stroke={connected ? "var(--brand)" : "var(--ink-muted)"}
                    strokeWidth={connected ? 2.4 : 1.4}
                    strokeOpacity={dimmed ? 0.08 : connected ? 0.9 : 0.28}
                    markerEnd={`url(#${connected ? markerActive : markerIdle})`}
                    className="transition-[stroke-opacity,stroke-width] duration-200"
                  />
                );
              })}

              {layout.nodes.map((node, index) => (
                <SkillNodeShape
                  key={node.slug}
                  node={node}
                  index={index}
                  selected={selected === node.slug}
                  hovered={hovered === node.slug}
                  dimmed={focusSet != null && !focusSet.has(node.slug)}
                  reduceMotion={reduceMotion}
                  onHover={setHovered}
                  onSelect={(slug) =>
                    setSelected((current) => (current === slug ? null : slug))
                  }
                />
              ))}
            </g>
          </svg>

          <div data-zoom-controls>
            <ZoomControls
              zoom={zoom}
              onZoomIn={() =>
                zoomAt(zoom + ZOOM_STEP, viewportSize.w / 2, viewportSize.h / 2)
              }
              onZoomOut={() =>
                zoomAt(zoom - ZOOM_STEP, viewportSize.w / 2, viewportSize.h / 2)
              }
              onFit={fitToView}
              onReset={resetView}
            />
          </div>
        </div>

        <p className="border-t border-ink/10 px-4 py-2 text-xs text-ink-muted">
          Scroll to zoom · Drag to pan · Click a skill for evidence · Dashed = not started
        </p>
      </div>

      {!compact && (
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key={selectedNode.slug}
              initial={reduceMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
              className="min-h-[280px] border-t border-ink/10 lg:min-h-0 lg:border-t-0"
            >
              <SkillDetailPanel
                skill={selectedNode}
                prerequisites={prerequisites}
                leadsTo={leadsTo}
                onSelect={setSelected}
                onClose={() => setSelected(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden items-center justify-center border-l border-ink/10 px-8 py-12 text-center lg:flex"
            >
              <div className="max-w-xs">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <circle cx="7" cy="8" r="2.2" />
                    <circle cx="17" cy="7" r="2.2" />
                    <circle cx="12" cy="16" r="2.2" />
                    <path d="M8.8 9.2 10.5 14.2M15.2 8.6 13.5 14.1M9.2 8h5.6" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="font-display text-lg font-semibold text-ink">
                  Explore the graph
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Zoom in on a path, then select any skill — including ones you have not
                  started — to see how it unlocks.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {compact && selectedNode && (
        <div className="border-t border-ink/10">
          <SkillDetailPanel
            skill={selectedNode}
            prerequisites={prerequisites}
            leadsTo={leadsTo}
            onSelect={setSelected}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  );
}
