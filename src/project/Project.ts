import { assert, expect } from "../utils/assert.js";
import { PropertySetter } from "../utils/types.js";
import { expectSerializedNode } from "./serialization.js";
import {
  SerializedCell,
  SerializedNode,
  SerializedPage,
  SerializedProject,
  SerializedPath,
} from "./types.js";
import { v4 as uuid } from "uuid";

interface ColorFill {
  type: "color";
  value: string;
  opacity: number;
}

interface ImageFill {
  type: "image";
  value: string;
  opacity: number;
}

export type Fill = ColorFill | ImageFill;

class WithFills {
  fills: Fill[];

  constructor(opt: { fills: Fill[] }) {
    this.fills = opt.fills;
  }

  setFill(index: number, fill: PropertySetter<Fill>) {
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
    fills: opt.fills ?? [{ type: "color", value: "#ffffff", opacity: 1 }],
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
    fills: opt.fills ?? [{ type: "color", value: "#dddddd", opacity: 1 }],
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
