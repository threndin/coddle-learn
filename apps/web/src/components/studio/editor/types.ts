export type EditorSelection =
  | { kind: "course" }
  | { kind: "module"; id: string }
  | { kind: "lesson"; id: string };
