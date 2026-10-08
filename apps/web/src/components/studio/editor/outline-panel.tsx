"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COURSE_LIMITS, formatMinutes } from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import type { StudioLesson, StudioModule } from "@/lib/studio";
import type { EditorSelection } from "./types";

const MODULE = "module:";
const LESSON = "lesson:";
const DROP = "drop:";

function rawId(id: string | number) {
  return String(id).split(":")[1] ?? "";
}

function outlineKey(modules: StudioModule[]) {
  return modules.map((m) => `${m.id}[${m.lessons.map((l) => l.id).join(",")}]`).join("|");
}

export function OutlinePanel({
  modules,
  selection,
  onSelect,
  readOnly,
  checklistDone,
  checklistTotal,
  onReorder,
  onAddModule,
  onAddLesson,
}: {
  modules: StudioModule[];
  selection: EditorSelection;
  onSelect: (selection: EditorSelection) => void;
  readOnly: boolean;
  checklistDone: number;
  checklistTotal: number;
  onReorder: (modules: StudioModule[]) => void;
  onAddModule: (title: string) => Promise<boolean>;
  onAddLesson: (moduleId: string, title: string) => Promise<boolean>;
}) {
  const [dragItems, setDragItems] = useState<StudioModule[] | null>(null);
  const items = dragItems ?? modules;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const snapshot = useRef<StudioModule[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collision: CollisionDetection = (args) => {
    const type = String(args.active.id).startsWith(MODULE) ? "module" : "lesson";
    const droppableContainers = args.droppableContainers.filter((container) => {
      const id = String(container.id);
      if (type === "module") return id.startsWith(MODULE);
      if (id.startsWith(LESSON)) return true;
      if (id.startsWith(DROP)) {
        const target = items.find((m) => m.id === rawId(id));
        return Boolean(target && target.lessons.length === 0);
      }
      return false;
    });
    return closestCenter({ ...args, droppableContainers });
  };

  function moduleOfLesson(list: StudioModule[], lessonId: string) {
    return list.find((m) => m.lessons.some((l) => l.id === lessonId));
  }

  function onDragStart(event: DragStartEvent) {
    snapshot.current = modules;
    setDragItems(modules);
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !String(active.id).startsWith(LESSON)) return;
    const lessonId = rawId(active.id);
    const overId = String(over.id);
    setDragItems((current) => {
      const prev = current ?? modules;
      const from = moduleOfLesson(prev, lessonId);
      const to = overId.startsWith(DROP)
        ? prev.find((m) => m.id === rawId(overId))
        : overId.startsWith(LESSON)
          ? moduleOfLesson(prev, rawId(overId))
          : undefined;
      if (!from || !to || from.id === to.id) return prev;
      if (to.lessons.length >= COURSE_LIMITS.lessonsPerModuleMax) return prev;

      const lesson = from.lessons.find((l) => l.id === lessonId)!;
      let index = to.lessons.length;
      if (overId.startsWith(LESSON)) {
        const overIndex = to.lessons.findIndex((l) => l.id === rawId(overId));
        const translated = active.rect.current.translated;
        const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
        index = overIndex + (below ? 1 : 0);
      }
      return prev.map((m) => {
        if (m.id === from.id) return { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) };
        if (m.id === to.id) {
          const lessons = [...m.lessons];
          lessons.splice(index, 0, lesson);
          return { ...m, lessons };
        }
        return m;
      });
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    let next = items;
    if (over) {
      const activeKey = String(active.id);
      const overKey = String(over.id);
      if (activeKey.startsWith(MODULE) && overKey.startsWith(MODULE) && activeKey !== overKey) {
        const fromIndex = items.findIndex((m) => m.id === rawId(activeKey));
        const toIndex = items.findIndex((m) => m.id === rawId(overKey));
        next = arrayMove(items, fromIndex, toIndex);
      }
      if (activeKey.startsWith(LESSON) && overKey.startsWith(LESSON)) {
        const parent = moduleOfLesson(items, rawId(activeKey));
        if (parent && parent.lessons.some((l) => l.id === rawId(overKey))) {
          const fromIndex = parent.lessons.findIndex((l) => l.id === rawId(activeKey));
          const toIndex = parent.lessons.findIndex((l) => l.id === rawId(overKey));
          if (fromIndex !== toIndex) {
            next = items.map((m) =>
              m.id === parent.id ? { ...m, lessons: arrayMove(m.lessons, fromIndex, toIndex) } : m,
            );
          }
        }
      }
    } else if (snapshot.current) {
      next = snapshot.current;
    }

    setDragItems(null);
    setActiveId(null);
    if (snapshot.current && outlineKey(next) !== outlineKey(snapshot.current)) onReorder(next);
    snapshot.current = null;
  }

  function onDragCancel() {
    snapshot.current = null;
    setDragItems(null);
    setActiveId(null);
  }

  const activeModule = activeId?.startsWith(MODULE)
    ? items.find((m) => m.id === rawId(activeId))
    : null;
  const activeLesson = activeId?.startsWith(LESSON)
    ? items.flatMap((m) => m.lessons).find((l) => l.id === rawId(activeId))
    : null;

  const lessonCount = items.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalMinutes = items.reduce(
    (sum, m) =>
      sum +
      m.lessons.reduce(
        (inner, l) =>
          inner + l.estimatedMinutes + l.exercises.reduce((ex, e) => ex + e.estimatedMinutes, 0),
        0,
      ),
    0,
  );

  return (
    <nav aria-label="Course outline" className="flex h-full flex-col">
      <div className="shrink-0 p-3">
        <button
          type="button"
          onClick={() => onSelect({ kind: "course" })}
          className={[
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
            selection.kind === "course"
              ? "bg-brand-soft text-brand"
              : "text-ink hover:bg-surface-subtle",
          ].join(" ")}
        >
          <Icon name="settings" className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-sm font-semibold">Course details</span>
          <ChecklistRing done={checklistDone} total={checklistTotal} />
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-between px-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Outline
        </p>
        <p
          className="font-mono text-[11px] tabular-nums text-ink-muted"
          title={`${items.length} modules · ${lessonCount} lessons`}
        >
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"} · {formatMinutes(totalMinutes || 0)}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <Icon name="layers" className="mx-auto h-6 w-6 text-ink-muted" />
            <p className="mt-2 text-sm font-semibold text-ink">No modules yet</p>
            <p className="mt-1 text-xs text-ink-muted">
              Modules group lessons into chapters. Add your first one below.
            </p>
          </div>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext
            items={items.map((m) => `${MODULE}${m.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-1.5">
              {items.map((courseModule, index) => (
                <SortableModule
                  key={courseModule.id}
                  index={index}
                  courseModule={courseModule}
                  selection={selection}
                  onSelect={onSelect}
                  readOnly={readOnly}
                  collapsed={collapsed.has(courseModule.id) || Boolean(activeModule)}
                  onToggle={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(courseModule.id)) next.delete(courseModule.id);
                      else next.add(courseModule.id);
                      return next;
                    })
                  }
                  onAddLesson={(title) => onAddLesson(courseModule.id, title)}
                />
              ))}
            </ol>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>
            {activeModule ? (
              <div className="flex items-center gap-2 rounded-xl border border-brand bg-surface px-3 py-2.5 shadow-2xl shadow-ink/15">
                <Icon name="grip" className="h-4 w-4 text-ink-muted" />
                <span className="truncate text-sm font-semibold text-ink">{activeModule.title}</span>
                <span className="ml-auto font-mono text-[11px] text-ink-muted">
                  {activeModule.lessons.length}
                </span>
              </div>
            ) : activeLesson ? (
              <div className="flex items-center gap-2 rounded-lg border border-brand bg-surface px-2.5 py-2 shadow-2xl shadow-ink/15">
                <Icon name="file" className="h-3.5 w-3.5 text-brand" />
                <span className="truncate text-sm text-ink">{activeLesson.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {!readOnly ? (
          <InlineAdd
            label="Add module"
            placeholder="Module title"
            className="mt-3"
            emphasis
            onSubmit={onAddModule}
          />
        ) : null}
      </div>
    </nav>
  );
}

function SortableModule({
  index,
  courseModule,
  selection,
  onSelect,
  readOnly,
  collapsed,
  onToggle,
  onAddLesson,
}: {
  index: number;
  courseModule: StudioModule;
  selection: EditorSelection;
  onSelect: (selection: EditorSelection) => void;
  readOnly: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onAddLesson: (title: string) => Promise<boolean>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${MODULE}${courseModule.id}`, disabled: readOnly });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `${DROP}${courseModule.id}`,
    disabled: readOnly,
  });
  const active = selection.kind === "module" && selection.id === courseModule.id;
  const lessonIds = useMemo(
    () => courseModule.lessons.map((l) => `${LESSON}${l.id}`),
    [courseModule.lessons],
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={["rounded-xl", isDragging ? "opacity-40" : ""].join(" ")}
    >
      <div
        className={[
          "group flex items-center gap-1 rounded-xl px-1.5 py-1.5 transition",
          active ? "bg-brand-soft" : "hover:bg-surface-subtle",
        ].join(" ")}
      >
        {!readOnly ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${courseModule.title}`}
            className="inline-flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-ink-muted opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          >
            <Icon name="grip" className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="w-1" />
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand module" : "Collapse module"}
          aria-expanded={!collapsed}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition hover:text-ink"
        >
          <Icon
            name="chevronRight"
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-90"}`}
          />
        </button>
        <button
          type="button"
          onClick={() => onSelect({ kind: "module", id: courseModule.id })}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span
            className={[
              "font-mono text-[10px] font-semibold tabular-nums",
              active ? "text-brand" : "text-ink-muted",
            ].join(" ")}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={[
              "truncate text-sm font-semibold",
              active ? "text-brand" : "text-ink",
            ].join(" ")}
          >
            {courseModule.title}
          </span>
        </button>
        {courseModule.lessons.every((l) => l.exercises.length === 0) ? (
          <span
            title="Add an exercise to one of this module's lessons"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
          />
        ) : null}
        <span className="shrink-0 pr-1.5 font-mono text-[10px] tabular-nums text-ink-muted">
          {courseModule.lessons.length}
        </span>
      </div>

      {!collapsed ? (
        <div
          ref={setDropRef}
          className={[
            "ml-[1.6rem] mt-0.5 border-l pl-2 transition",
            isOver ? "border-brand" : "border-border",
          ].join(" ")}
        >
          <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-0.5 py-0.5">
              {courseModule.lessons.map((lesson) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  active={selection.kind === "lesson" && selection.id === lesson.id}
                  readOnly={readOnly}
                  onSelect={() => onSelect({ kind: "lesson", id: lesson.id })}
                />
              ))}
            </ul>
          </SortableContext>
          {courseModule.lessons.length === 0 ? (
            <p
              className={[
                "rounded-lg px-2.5 py-2 text-xs",
                isOver ? "bg-brand-soft text-brand" : "text-ink-muted",
              ].join(" ")}
            >
              {isOver ? "Drop to move here" : "No lessons yet"}
            </p>
          ) : null}
          {!readOnly ? (
            <InlineAdd label="Add lesson" placeholder="Lesson title" onSubmit={onAddLesson} />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function SortableLesson({
  lesson,
  active,
  readOnly,
  onSelect,
}: {
  lesson: StudioLesson;
  active: boolean;
  readOnly: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: `${LESSON}${lesson.id}`, disabled: readOnly });
  const thin = lesson.content.trim().length < COURSE_LIMITS.lessonContentMin;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      <div
        className={[
          "group flex items-center gap-1 rounded-lg pr-2 transition",
          active ? "bg-brand text-white" : "text-ink-muted hover:bg-surface-subtle hover:text-ink",
        ].join(" ")}
      >
        {!readOnly ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${lesson.title}`}
            className={[
              "inline-flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing",
              active ? "text-white/70" : "text-ink-muted",
            ].join(" ")}
          >
            <Icon name="grip" className="h-3 w-3" />
          </button>
        ) : (
          <span className="w-2" />
        )}
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-[13px]"
        >
          <span className="truncate">{lesson.title}</span>
        </button>
        {lesson.exercises.length > 0 ? (
          <span
            title={`${lesson.exercises.length} ${lesson.exercises.length === 1 ? "exercise" : "exercises"}`}
            className={[
              "inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] tabular-nums",
              active ? "text-white/70" : "text-ink-muted",
            ].join(" ")}
          >
            <Icon name="target" className="h-3 w-3" />
            {lesson.exercises.length}
          </span>
        ) : null}
        {thin ? (
          <span
            title="Needs more content before submitting"
            className={[
              "h-1.5 w-1.5 shrink-0 rounded-full",
              active ? "bg-amber-200" : "bg-amber-500",
            ].join(" ")}
          />
        ) : (
          <span
            className={[
              "shrink-0 font-mono text-[10px] tabular-nums",
              active ? "text-white/70" : "text-ink-muted",
            ].join(" ")}
          >
            {lesson.estimatedMinutes}m
          </span>
        )}
      </div>
    </li>
  );
}

function InlineAdd({
  label,
  placeholder,
  onSubmit,
  className = "",
  emphasis = false,
}: {
  label: string;
  placeholder: string;
  onSubmit: (title: string) => Promise<boolean>;
  className?: string;
  emphasis?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    const title = value.trim();
    if (!title || pending) return;
    setPending(true);
    const ok = await onSubmit(title);
    setPending(false);
    if (ok) {
      setValue("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition",
          emphasis
            ? "border border-dashed border-border py-2.5 text-ink-muted hover:border-brand hover:text-brand"
            : "text-ink-muted hover:bg-surface-subtle hover:text-brand",
          className,
        ].join(" ")}
      >
        <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
        {label}
      </button>
    );
  }

  return (
    <form
      className={`flex items-center gap-1.5 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <input
        autoFocus
        value={value}
        disabled={pending}
        maxLength={COURSE_LIMITS.lessonTitleMax}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
        onBlur={() => {
          if (!value.trim() && !pending) setOpen(false);
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-brand bg-surface px-2.5 py-1.5 text-xs text-ink ring-4 ring-brand/10 placeholder:text-ink-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={!value.trim() || pending}
        className="shrink-0 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? "…" : "Add"}
      </button>
    </form>
  );
}

function ChecklistRing({ done, total }: { done: number; total: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const complete = done === total;
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center" title={`${done}/${total} ready`}>
      <svg viewBox="0 0 20 20" className="h-6 w-6 -rotate-90">
        <circle cx="10" cy="10" r={r} fill="none" stroke="var(--border)" strokeWidth="2.2" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={complete ? "#10b981" : "var(--brand)"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      {complete ? (
        <Icon name="check" className="absolute h-3 w-3 text-emerald-500" strokeWidth={3} />
      ) : (
        <span className="absolute font-mono text-[8px] font-bold text-ink-muted">{done}</span>
      )}
    </span>
  );
}
