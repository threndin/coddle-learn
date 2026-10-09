/**
 * WHATWG URL exists in both Node and browsers, but this package compiles
 * without DOM or Node typings. Only the members shared code relies on.
 */
declare class URLSearchParams {
  keys(): IterableIterator<string>;
  delete(name: string): void;
}

declare class URL {
  constructor(input: string, base?: string);
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly searchParams: URLSearchParams;
  toString(): string;
}
