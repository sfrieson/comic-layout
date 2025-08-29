import { assert, expect } from "../utils/assert.js";
import { PropertySetter } from "../utils/types.js";
import {
  SerializedCell,
  SerializedNode,
  SerializedPage,
  SerializedProject,
  SerializedPath,
  SerializedFill,
} from "./types.js";
import { v4 as uuid } from "uuid";

interface ColorFill {
  type: "color";
  value: string;
  opacity: number;
}

interface IDBImageFill {
  type: "image";
  value: number | null; // IDBValidKey
  opacity: number;
  position:
    | "cover"
    | "stretch"
    | "contain"
    | { x: number; y: number; width: number; height: number };
}

export type Fill = ColorFill | IDBImageFill;

interface DLLNode<T> {
  data: T;
  next: DLLNode<T>;
  prev: DLLNode<T>;
}
export class RenderQueue<T extends object> {
  name = "RenderQueue";
  length: number = 0;
  #end = {
    data: null as unknown as T,
    next: null as unknown as DLLNode<T>,
    prev: null as unknown as DLLNode<T>,
  };

  constructor(name: string, opt: { data: T[] }) {
    this.name = name;
    // this.#head = this.#end;
    // this.#tail = this.#end;
    this.length = 0;
    this.#end.next = this.#end;
    this.#end.prev = this.#end;
    opt.data.forEach((item) => this.enqueue(item));
  }

  enqueue(data: T) {
    const node: DLLNode<T> = {
      data,
      next: this.#end,
      prev: this.#end.prev,
    };
    if (this.#end.next === this.#end) {
      this.#end.next = node;
    }
    this.#end.prev.next = node;
    this.#end.prev = node;
    this.length++;
    return node;
  }

  removeItem(index: number) {
    const node = this.#getNode(index);
    node.prev.next = node.next;
    node.next.prev = node.prev;
    this.length--;
    return node;
  }

  #getNode(index: number) {
    let node = this.#end;
    do {
      node = node.next;
      if (node === this.#end) {
        throw new Error(`${this.name} node ${index} not found`);
      }
    } while (--index > -1);
    return node;
  }

  updateItem<LocalT extends T>(
    index: number,
    nextItem: PropertySetter<LocalT, T>,
  ) {
    const node = this.#getNode(index);
    if (typeof nextItem === "function") {
      node.data = nextItem(node.data);
    } else {
      node.data = nextItem;
    }
  }

  // iterators
  *renderOrder(): IterableIterator<T> {
    if (this.length === 0) return;
    let current = this.#end.next;
    while (current !== this.#end) {
      yield current.data;
      current = current.next;
    }
  }

  // iterators
  *listOrder(): IterableIterator<T> {
    let current = this.#end.prev;
    while (current !== this.#end) {
      yield current.data;
      current = current.prev;
    }
  }
}

export class WithFills {
  fills: Fill[];

  constructor(opt: { fills: Fill[] }) {
    this.fills = opt.fills;
  }

  setFill<F extends Fill>(index: number, fill: PropertySetter<F, Fill>) {
    const currentFill = expect(this.fills[index], "Fill not found");
    if (typeof fill === "function") {
      this.fills[index] = fill(currentFill);
    } else {
      this.fills[index] = fill;
    }
  }
  addFill(fill: Fill, at: number | null = null) {
    if (at === null) {
      this.fills.push(fill);
    } else {
      this.fills.splice(at, 0, fill);
    }
  }

  removeFill(index: number) {
    assert(this.fills[index], "Fill not found");
    this.fills.splice(index, 1);
  }

  static createColorFill(value: string = "#ffffff", opacity: number = 1) {
    return { type: "color" as const, value, opacity };
  }

  static createImageFill(
    value: number | null = null,
    opacity: number = 1,
  ): IDBImageFill {
    return { type: "image" as const, value, opacity, position: "cover" };
  }
}

function fillsFromSerialized(fills: SerializedFill[]) {
  return fills.map((fill) => {
    if (fill.type === "color") {
      return WithFills.createColorFill(fill.value, fill.opacity);
    }
    if (fill.type === "image") {
      return WithFills.createImageFill(fill.value, fill.opacity);
    }
    throw new Error(`Unknown fill type: ${(fill as Fill).type}`);
  });
}

type SeralizedNodeMap = Map<string, SerializedNode>;
export class Page extends WithFills {
  type = "page" as const;
  id: string;
  name: string;
  width: number;
  height: number;
  children: Node[];

  constructor(opt: {
    id: string;
    name?: string;
    width: number;
    height: number;
    fills: Fill[];
    children: Node[];
  }) {
    super(opt);
    this.id = opt.id;
    this.name = opt.name ?? "Page";
    this.width = opt.width;
    this.height = opt.height;
    this.children = opt.children;
  }
}

export function createPage(opt: {
  width: number;
  height: number;
  fills?: Fill[];
  children?: Node[];
}) {
  return new Page({
    ...opt,
    id: uuid(),
    fills: opt.fills ?? [WithFills.createColorFill("#ffffff")],
    children: opt.children ?? [],
  });
}

export function pageFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedPage,
) {
  const page = new Page({
    ...serialized,
    children: [],
    fills: fillsFromSerialized(serialized.fills),
  });
  project.nodeMap.set(page.id, page);
  serialized.children.forEach((id) => {
    const node = expectSerializedNode(nodeMap.get(id), "cell");
    const cell = cellFromSerialized(project, nodeMap, node, page);
    page.children.push(cell);
  });

  return page;
}

export class Cell extends WithFills {
  type = "cell" as const;
  id: string;
  translation: { x: number; y: number };
  path: Path;
  children: Node[];
  parent: Page;

  constructor(opt: {
    id: string;
    translation?: { x: number; y: number };
    fills: Fill[];
    children: Node[];
    path: Path;
    parent: Page;
  }) {
    super(opt);
    this.id = opt.id;
    this.translation = opt.translation ?? { x: 0, y: 0 };
    this.children = opt.children ?? [];
    this.path = opt.path;
    this.parent = opt.parent;
  }
}

export function createCell(opt: {
  translation?: { x: number; y: number };
  fills?: Fill[];
  children?: Node[];
  path?: Path;
  parent: Page;
}) {
  return new Cell({
    id: uuid(),
    ...opt,
    fills: opt.fills ?? [WithFills.createColorFill("#dddddd")],
    children: opt.children ?? [],
    path:
      opt.path ??
      Path.create({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        closed: false,
      }),
    parent: opt.parent,
  });
}

export function cellFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedCell,
  parent: Page,
) {
  const cell = new Cell({
    ...serialized,
    // children: serialized.children.map((id) => {
    //   const node = expectSerializedNode(nodeMap.get(id), "cell");
    //   const cell = Cell.fromSerialized(project, nodeMap, node);
    //   return cell;
    // }),
    path: Path.fromSerialized(project, nodeMap, serialized.path),
    fills: fillsFromSerialized(serialized.fills),
    children: [],
    parent,
  });
  project.nodeMap.set(cell.id, cell);
  return cell;
}

export type Node = Page | Cell;

export class Path {
  type = "path" as const;
  id: string;
  points: { x: number; y: number }[];
  closed: boolean;

  constructor(opt: {
    id: string;
    points: { x: number; y: number }[];
    closed: boolean;
  }) {
    this.id = opt.id;
    this.points = opt.points;
    this.closed = opt.closed;
  }

  static create(
    opt: Partial<{ points: { x: number; y: number }[]; closed: boolean }> = {},
  ) {
    return new Path({
      id: uuid(),
      points: opt.points ?? [],
      closed: opt.closed ?? false,
    });
  }

  static fromSerialized(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedPath,
  ) {
    const path = new Path(serialized);
    return path;
  }
}

export class Project {
  nodeMap: Map<string, Node> = new Map();
  pages: Page[];
  images: Set<number>;
  meta: {
    name: string;
    createdAt: string;
    _changes: number;
  };

  constructor(serialized?: SerializedProject | null) {
    const nodeMap = new Map(
      serialized?.nodes.map((node) => [node.id, node]) ?? [],
    );

    this.pages =
      serialized?.pages.map((id) => {
        const node = expectSerializedNode(nodeMap.get(id), "page");
        const page = pageFromSerialized(this, nodeMap, node);

        return page;
      }) ?? [];

    this.images = new Set(serialized?.images ?? []);
    this.meta = {
      name: serialized?.meta?.name ?? "New Project",
      createdAt: serialized?.meta?.createdAt ?? new Date().toISOString(),
      _changes: 0,
    };
  }

  addPage(page: Page) {
    this.pages.push(page);
    this.nodeMap.set(page.id, page);
  }

  removePage(page: Page) {
    this.pages = this.pages.filter((p) => p.id !== page.id);
    this.nodeMap.delete(page.id);
    // not deleting other page nodes.
    // They'll be around for undo operations
    // Not sure if they're needed for other connections
    //  They should be cleaned up in serialization.
  }

  addCell(page: Page, cell: Cell, index: number | null = null) {
    if (index === null) {
      page.children.push(cell);
    } else {
      page.children.splice(index, 0, cell);
    }
    this.nodeMap.set(cell.id, cell);
  }

  removeCell(page: Page, cell: Cell) {
    if (page) page.children = page.children.filter((c) => c.id !== cell.id);
    this.nodeMap.delete(cell.id);
  }
}

export function expectNodeType<T extends Node["type"]>(
  node: Node | undefined,
  type: T,
): Extract<Node, { type: T }> {
  assert(node, `Node not found`);

  return expect(
    node.type === type,
    `Node ${node.id} is not a ${type}`,
  ) as unknown as Extract<Node, { type: T }>;
}

function assertSerialzedNode<T extends SerializedNode["type"]>(
  node: SerializedNode | null | undefined,
  type: T,
): asserts node is Extract<SerializedNode, { type: T }> {
  assert(node?.type === type, `Node ${node?.id} is not a ${type}`);
}

function expectSerializedNode<T extends SerializedNode["type"]>(
  node: SerializedNode | null | undefined,
  type: T,
) {
  assertSerialzedNode(node, type);
  return node as Extract<SerializedNode, { type: T }>;
}
