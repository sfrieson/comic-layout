import { assert, expect } from "../utils/assert.js";
import { Vec2 } from "../utils/vec2.js";
import { RenderQueue } from "./RenderQueue.js";
import type {
  SerializedCell,
  SerializedNode,
  SerializedPage,
  SerializedProject,
  SerializedPath,
  SerializedFill,
  SerializedRectangle,
  SerializedPathAlignedText,
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

export const Fills = {
  createColorFill(value: string = "#ffffff", opacity: number = 1): ColorFill {
    return { type: "color" as const, value, opacity };
  },

  createImageFill(
    value: number | null = null,
    opacity: number = 1,
  ): IDBImageFill {
    return { type: "image" as const, value, opacity, position: "cover" };
  },
};

function fillsFromSerialized(fills: SerializedFill[]) {
  return fills.map((fill) => {
    if (fill.type === "color") {
      return Fills.createColorFill(fill.value, fill.opacity);
    }
    if (fill.type === "image") {
      return Fills.createImageFill(fill.value, fill.opacity);
    }
    throw new Error(`Unknown fill type: ${(fill as Fill).type}`);
  });
}

type SeralizedNodeMap = Map<string, SerializedNode>;
export class Page {
  type = "page" as const;
  id: string;
  name: string;
  width: number;
  height: number;
  fills: RenderQueue<Fill>;
  children: RenderQueue<Node>;

  get translation() {
    return {
      get x() {
        return 0;
      },
      set x(value: number) {
        throw new Error("Page translation is not mutable");
      },
      get y() {
        return 0;
      },
      set y(value: number) {
        throw new Error("Page translation is not mutable");
      },
    };
  }
  set translation(value: any) {
    throw new Error("Page translation is not mutable");
  }

  constructor(opt: {
    id: string;
    name?: string;
    width: number;
    height: number;
    fills: Fill[];
    children: Node[];
  }) {
    this.id = opt.id;
    this.name = opt.name ?? "Page";
    this.width = opt.width;
    this.height = opt.height;
    this.fills = new RenderQueue("fill", opt.fills);
    this.children = new RenderQueue("child", opt.children);
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
    fills: opt.fills ?? [Fills.createColorFill("#ffffff")],
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
  childrenFromSerialized(project, nodeMap, page, serialized.children);
  return page;
}

function childrenFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  parent: Node,
  childIds: string[],
) {
  childIds.forEach((id) => {
    const node = expect(nodeMap.get(id), "Child not found");
    let child: Node;
    switch (node.type) {
      case "cell":
        child = cellFromSerialized(project, nodeMap, node, parent);
        break;
      case "rectangle":
        child = rectangleFromSerialized(project, nodeMap, node, parent);
        break;
      case "text_path-aligned":
        child = pathAlignedTextFromSerialized(project, nodeMap, node, parent);
        break;
      default:
        if (node.type === "page") {
          throw new Error("Page cannot have a parent that is not a page");
        }
        const _unreachable: never = node;
        throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
    }
    parent.children.push(child);
  });
}

export class Rectangle {
  type = "rectangle" as const;
  id: string;
  translation: Vec2;
  width: number;
  height: number;
  fills: RenderQueue<Fill>;
  parent: Node;
  /** Not used, but keeps it consistent with other nodes */
  children: RenderQueue<Node>;

  constructor(opt: {
    id: string;
    translation?: Vec2;
    width: number;
    height: number;
    fills: Fill[];
    parent: Node;
    children?: Node[];
  }) {
    this.id = opt.id;
    this.translation = opt.translation ?? { x: 0, y: 0 };
    this.width = opt.width;
    this.height = opt.height;
    this.fills = new RenderQueue("fill", opt.fills);
    this.parent = opt.parent;
    this.children = new RenderQueue("child", opt.children ?? []);
  }

  get path() {
    return new Path({
      id: uuid(),
      points: [
        { x: 0, y: 0 },
        { x: this.width, y: 0 },
        { x: this.width, y: this.height },
        { x: 0, y: this.height },
      ],
      closed: true,
    });
  }
}

export function createRectangle(opt: {
  translation?: Vec2;
  width?: number;
  height?: number;
  fills?: Fill[];
  parent: Node;
}) {
  return new Rectangle({
    translation: { x: 0, y: 0 },
    width: 100,
    height: 100,
    fills: [Fills.createColorFill("#dddddd")],
    ...opt,
    id: uuid(),
  });
}

function rectangleFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedRectangle,
  parent: Node,
) {
  const rectangle = new Rectangle({
    ...serialized,
    fills: fillsFromSerialized(serialized.fills),
    children: [],
    parent,
  });
  project.nodeMap.set(rectangle.id, rectangle);
  childrenFromSerialized(project, nodeMap, rectangle, serialized.children);
  return rectangle;
}

export class Cell {
  type = "cell" as const;
  id: string;
  translation: Vec2;
  path: Path;
  fills: RenderQueue<Fill>;
  children: RenderQueue<Node>;
  parent: Node;

  constructor(opt: {
    id: string;
    translation?: Vec2;
    fills: Fill[];
    children: Node[];
    path: Path;
    parent: Node;
  }) {
    this.id = opt.id;
    this.translation = opt.translation ?? { x: 0, y: 0 };
    this.fills = new RenderQueue("fill", opt.fills);
    this.children = new RenderQueue<Node>("child", opt.children ?? []);
    this.path = opt.path;
    this.parent = opt.parent;
  }
}

export function createCell(opt: {
  translation?: Vec2;
  fills?: Fill[];
  children?: Node[];
  path?: Path;
  parent: Page;
}) {
  return new Cell({
    id: uuid(),
    ...opt,
    fills: opt.fills ?? [Fills.createColorFill("#dddddd")],
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
        closed: true,
      }),
    parent: opt.parent,
  });
}

export function cellFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedCell,
  parent: Node,
) {
  const cell = new Cell({
    ...serialized,
    path: Path.fromSerialized(project, nodeMap, serialized.path),
    fills: fillsFromSerialized(serialized.fills),
    children: [],
    parent,
  });
  project.nodeMap.set(cell.id, cell);
  childrenFromSerialized(project, nodeMap, cell, serialized.children);
  return cell;
}

export class PathAlignedText {
  type = "text_path-aligned" as const;
  id: string;
  translation: Vec2;
  parent: Node;

  alignment: "left" | "center" | "right";
  alignmentEdge: { x: number }[];
  lines: string[];
  lineHeight: number;
  fills: RenderQueue<Fill>;

  constructor(opt: {
    id: string;
    translation: Vec2;
    parent: Node;
    alignment: "left" | "center" | "right";
    alignmentEdge: { x: number }[];
    lines: string[];
    lineHeight: number;
    fills: Fill[];
  }) {
    this.id = opt.id;
    this.translation = opt.translation;
    this.parent = opt.parent;
    this.alignment = opt.alignment;
    this.alignmentEdge = opt.alignmentEdge;
    this.lines = opt.lines;
    this.fills = new RenderQueue("fill", opt.fills);
    this.lineHeight = opt.lineHeight;
  }

  get children() {
    return new RenderQueue<Node>("child", []);
  }
}

export function createTextPathAligned(opt: {
  translation?: Vec2;
  parent: Node;
  alignment?: "left" | "center" | "right";
  alignmentEdge?: { x: number }[];
  lineHeight?: number;
}) {
  return new PathAlignedText({
    lineHeight: 1.4,
    lines: ["Text"],
    alignment: "left",
    alignmentEdge: [{ x: 0 }],
    translation: { x: 0, y: 0 },
    ...opt,
    fills: [Fills.createColorFill("#000000")],
    id: uuid(),
  });
}

function pathAlignedTextFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedPathAlignedText,
  parent: Node,
) {
  const node = new PathAlignedText({
    ...serialized,
    fills: fillsFromSerialized(serialized.fills),
    parent,
  });
  project.nodeMap.set(node.id, node);
  return node;
}

export type Node = Page | Cell | Rectangle | PathAlignedText;

export class Path {
  type = "path" as const;
  id: string;
  points: Vec2[];
  closed: boolean;

  constructor(opt: { id: string; points: Vec2[]; closed: boolean }) {
    this.id = opt.id;
    this.points = opt.points;
    this.closed = opt.closed;
  }

  static create(opt: Partial<{ points: Vec2[]; closed: boolean }> = {}) {
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
      page.children.insertAt(index, cell);
    }
    this.nodeMap.set(cell.id, cell);
  }

  removeCell(page: Page, cell: Cell) {
    page.children.removeItem(cell);
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
