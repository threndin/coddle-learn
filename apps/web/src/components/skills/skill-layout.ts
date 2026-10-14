import type { SkillEdge, SkillNode } from "@/lib/skills";

export type LaidOutNode = SkillNode & {
  x: number;
  y: number;
  depth: number;
  width: number;
  height: number;
};

export type GraphLayout = {
  nodes: LaidOutNode[];
  width: number;
  height: number;
  bySlug: Map<string, LaidOutNode>;
};

const COL_GAP = 220;
const ROW_GAP = 86;
const PAD_X = 72;
const PAD_Y = 64;
const NODE_H = 44;
/** Space before the label (status dot + gap). */
const LABEL_LEFT = 28;
/** Trailing padding after the label. */
const LABEL_RIGHT = 14;
/** Extra room so the credential checkmark never sits on the name. */
const CHECKMARK_SLOT = 18;
const CHAR_W = 7.4;

export function estimateNodeWidth(name: string, status?: string) {
  const trailing = status === "credentialed" ? LABEL_RIGHT + CHECKMARK_SLOT : LABEL_RIGHT;
  const raw = Math.round(LABEL_LEFT + name.length * CHAR_W + trailing);
  const max = status === "credentialed" ? 196 : 176;
  return Math.max(96, Math.min(max, raw));
}

/** Layer nodes left→right by prerequisite depth; stack within a column. */
export function layoutSkillGraph(
  nodes: SkillNode[],
  edges: SkillEdge[],
): GraphLayout {
  const nodeSlugs = new Set(nodes.map((node) => node.slug));
  const incoming = new Map<string, string[]>();

  for (const node of nodes) {
    incoming.set(node.slug, []);
  }

  for (const edge of edges) {
    if (!nodeSlugs.has(edge.from) || !nodeSlugs.has(edge.to)) continue;
    incoming.get(edge.to)!.push(edge.from);
  }

  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  function resolveDepth(slug: string): number {
    const cached = depth.get(slug);
    if (cached !== undefined) return cached;
    if (visiting.has(slug)) return 0;
    visiting.add(slug);
    const parents = incoming.get(slug) ?? [];
    const value =
      parents.length === 0
        ? 0
        : Math.max(...parents.map((parent) => resolveDepth(parent))) + 1;
    visiting.delete(slug);
    depth.set(slug, value);
    return value;
  }

  for (const node of nodes) resolveDepth(node.slug);

  const columns = new Map<number, SkillNode[]>();
  for (const node of nodes) {
    const d = depth.get(node.slug) ?? 0;
    const list = columns.get(d) ?? [];
    list.push(node);
    columns.set(d, list);
  }

  const categoryOrder = [
    "Frontend",
    "Language",
    "Backend",
    "Data",
    "Tools",
    "Practice",
  ];

  for (const list of columns.values()) {
    list.sort((a, b) => {
      const aCat = categoryOrder.indexOf(a.category);
      const bCat = categoryOrder.indexOf(b.category);
      if (aCat !== bCat) return (aCat === -1 ? 99 : aCat) - (bCat === -1 ? 99 : bCat);
      return a.name.localeCompare(b.name);
    });
  }

  const maxDepth = Math.max(0, ...Array.from(columns.keys()));
  const maxRows = Math.max(1, ...Array.from(columns.values()).map((list) => list.length));

  const laid: LaidOutNode[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const list = columns.get(d) ?? [];
    const columnHeight = Math.max(0, (list.length - 1) * ROW_GAP);
    const startY = PAD_Y + ((maxRows - 1) * ROW_GAP - columnHeight) / 2;
    list.forEach((node, index) => {
      const width = estimateNodeWidth(node.name, node.status);
      laid.push({
        ...node,
        depth: d,
        width,
        height: NODE_H,
        x: PAD_X + d * COL_GAP,
        y: startY + index * ROW_GAP,
      });
    });
  }

  return {
    nodes: laid,
    width: PAD_X * 2 + maxDepth * COL_GAP + 40,
    height: PAD_Y * 2 + Math.max(0, maxRows - 1) * ROW_GAP + NODE_H,
    bySlug: new Map(laid.map((node) => [node.slug, node])),
  };
}

/** Cubic edge from the right of `from` to the left of `to`. */
export function edgePath(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number },
) {
  const x1 = from.x + from.width / 2;
  const y1 = from.y;
  const x2 = to.x - to.width / 2;
  const y2 = to.y;
  const dx = Math.max(48, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}
