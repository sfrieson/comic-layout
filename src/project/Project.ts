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

interface BaseNodeOpts {
  id: string;
  translation?: Vec2;
  parent: Node | null;
  fills?: Fill[];
  children?: Node[];
}
abstract class BaseNode {
  type: string;
  id: string;
  translation: Vec2;
  fills: RenderQueue<Fill>;
  parent: Node | null;
  children: RenderQueue<Node>;

  constructor(opt: BaseNodeOpts & { type: string }) {
    this.type = opt.type;
    this.id = opt.id;
    this.translation = opt.translation ?? { x: 0, y: 0 };
    this.parent = opt.parent;
    this.fills = new RenderQueue("fill", opt.fills);
    this.children = new RenderQueue("child", opt.children);
  }

  static serializedToOpts(serialized: SerializedNode) {
    return {
      ...serialized,
      fills: fillsFromSerialized(serialized.fills),
    };
  }
}

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
export class Page extends BaseNode {
  type = "page" as const;
  id: string;
  name: string;
  width: number;
  height: number;
  fills: RenderQueue<Fill>;
  children: RenderQueue<Node>;

  constructor(
    opt: BaseNodeOpts & {
      name: string;
      width: number;
      height: number;
    },
  ) {
    super({
      ...opt,
      type: "page",
      parent: null,
    });
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
    name: "Page",
    fills: [Fills.createColorFill("#ffffff")],
    children: [],
    translation: { x: 0, y: 0 },
    parent: null,
    ...opt,
    id: uuid(),
  });
}

export function pageFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedPage,
) {
  const page = new Page({
    ...serialized,
    ...BaseNode.serializedToOpts(serialized),
    children: [],
    translation: { x: 0, y: 0 },
    parent: null,
  });
  project.nodeMap.set(page.id, page);
  childrenFromSerialized(project, nodeMap, page, serialized.children);
  return page;
}

export function nodeFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  node: SerializedNode,
  parent: Node | null,
) {
  switch (node.type) {
    case "cell":
      return cellFromSerialized(project, nodeMap, node, parent);
    case "rectangle":
      return rectangleFromSerialized(project, nodeMap, node, parent);
    case "text_path-aligned":
      return pathAlignedTextFromSerialized(project, nodeMap, node, parent);
    case "page":
      return pageFromSerialized(project, nodeMap, node);
    default:
      const _unreachable: never = node;
      throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
  }
}

function childrenFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  parent: Node | null,
  childIds: string[],
) {
  childIds.forEach((id) => {
    const child = nodeFromSerialized(
      project,
      nodeMap,
      expect(nodeMap.get(id), "Child not found"),
      parent,
    );
    (parent ?? project).children.push(child);
  });
}

export class Rectangle extends BaseNode {
  type = "rectangle" as const;
  width: number;
  height: number;

  constructor(
    opt: BaseNodeOpts & {
      width: number;
      height: number;
    },
  ) {
    super({
      ...opt,
      type: "rectangle",
    });
    this.width = opt.width;
    this.height = opt.height;
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
  children?: Node[];
  parent: Node;
}) {
  return new Rectangle({
    translation: { x: 0, y: 0 },
    width: 100,
    height: 100,
    fills: [Fills.createColorFill("#dddddd")],
    children: [],
    ...opt,
    id: uuid(),
  });
}

function rectangleFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedRectangle,
  parent: Node | null,
) {
  const rectangle = new Rectangle({
    ...serialized,
    ...BaseNode.serializedToOpts(serialized),
    children: [],
    parent,
  });
  project.nodeMap.set(rectangle.id, rectangle);
  childrenFromSerialized(
    project,
    nodeMap,
    rectangle,
    serialized.children ?? [],
  );
  return rectangle;
}

export class Cell extends BaseNode {
  type = "cell" as const;
  path: Path;

  constructor(
    opt: BaseNodeOpts & {
      path: Path;
    },
  ) {
    super({
      ...opt,
      type: "cell",
    });
    this.path = opt.path;
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
    fills: [Fills.createColorFill("#dddddd")],
    children: opt.children ?? [],
    path: Path.create({
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      closed: true,
    }),
    translation: { x: 0, y: 0 },
    ...opt,
  });
}

export function cellFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedCell,
  parent: Node | null,
) {
  const cell = new Cell({
    ...serialized,
    ...BaseNode.serializedToOpts(serialized),
    path: Path.fromSerialized(project, nodeMap, serialized.path),
    children: [],
    parent,
  });
  project.nodeMap.set(cell.id, cell);
  childrenFromSerialized(project, nodeMap, cell, serialized.children);
  return cell;
}

export class PathAlignedText extends BaseNode {
  type = "text_path-aligned" as const;

  alignment: "left" | "center" | "right";
  alignmentEdge: { x: number }[];
  lines: string[];
  lineHeight: number;
  fontSize: number;

  constructor(
    opt: BaseNodeOpts & {
      alignment: "left" | "center" | "right";
      alignmentEdge: { x: number }[];
      lines: string[];
      lineHeight: number;
      fills: Fill[];
      fontSize: number;
    },
  ) {
    super({
      ...opt,
      type: "text_path-aligned",
    });
    this.alignment = opt.alignment;
    this.alignmentEdge = opt.alignmentEdge;
    this.lines = opt.lines;
    this.lineHeight = opt.lineHeight;
    this.fontSize = opt.fontSize;
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
    fontSize: 10,
    children: [],
    ...opt,
    fills: [Fills.createColorFill("#000000")],
    id: uuid(),
  });
}

function pathAlignedTextFromSerialized(
  project: Project,
  nodeMap: SeralizedNodeMap,
  serialized: SerializedPathAlignedText,
  parent: Node | null,
) {
  const node = new PathAlignedText({
    ...serialized,
    ...BaseNode.serializedToOpts(serialized),
    parent,
    children: [],
  });
  project.nodeMap.set(node.id, node);
  childrenFromSerialized(project, nodeMap, node, serialized.children);
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
  children: RenderQueue<Node>;
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
    this.images = new Set(serialized?.images ?? []);

    this.children = new RenderQueue("child", []);
    childrenFromSerialized(this, nodeMap, null, serialized?.children ?? []);
    // serialized?.children.forEach((id) => {
    //   const node = expectSerializedNode(nodeMap.get(id), "page");
    //   const page = pageFromSerialized(this, nodeMap, node);
    // });

    this.meta = {
      name: serialized?.meta?.name ?? "New Project",
      createdAt: serialized?.meta?.createdAt ?? new Date().toISOString(),
      _changes: 0,
    };
  }

  addPage(page: Page) {
    this.children.push(page);
    this.nodeMap.set(page.id, page);
  }

  removePage(page: Page) {
    this.children.removeItem(page);
    this.nodeMap.delete(page.id);
    // not deleting other page nodes.
    // They'll be around for undo operations
    // Not sure if they're needed for other connections
    //  They should be cleaned up in serialization.
  }

  addCell(page: Page, cell: Cell, index: number | null = null) {
    if (index === null) {
      page.children.addToTop(cell);
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
