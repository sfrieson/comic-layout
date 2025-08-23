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

type Fill = ColorFill;

type SeralizedNodeMap = Map<string, SerializedNode>;
export class Page {
  type = "page" as const;
  id: string;
  name: string;
  width: number;
  height: number;
  fills: Fill[];
  children: Node[];

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
    this.fills = opt.fills;
    this.children = opt.children;
  }

  static create(opt: {
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

  static fromSerialized(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedPage,
  ) {
    const page = new Page({
      ...serialized,
      children: serialized.children.map((id) => {
        const node = expectSerializedNode(nodeMap.get(id), "cell");
        const cell = Cell.fromSerialized(project, nodeMap, node);
        project.nodeMap.set(cell.id, cell);
        return cell;
      }),
    });

    return page;
  }
}

export class Cell {
  type = "cell" as const;
  id: string;
  translation: { x: number; y: number };
  fills: Fill[];
  children: Node[];
  path: Path;

  constructor(opt: {
    id: string;
    translation?: { x: number; y: number };
    fills: Fill[];
    children: Node[];
    path?: Path;
  }) {
    this.id = opt.id;
    this.translation = opt.translation ?? { x: 0, y: 0 };
    this.fills = opt.fills;
    this.children = opt.children ?? [];
    this.path =
      opt.path ??
      Path.create({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        closed: false,
      });
  }

  static create(
    opt: {
      translation?: { x: number; y: number };
      fills?: Fill[];
      children?: Node[];
      path?: Path;
    } = {},
  ) {
    return new Cell({
      id: uuid(),
      ...opt,
      fills: opt.fills ?? [{ type: "color", value: "#dddddd", opacity: 1 }],
      children: opt.children ?? [],
    });
  }

  static fromSerialized(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedCell,
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
    });

    return cell;
  }
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
        const page = Page.fromSerialized(this, nodeMap, node);
        this.nodeMap.set(page.id, page);
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

  addCell(page: Page, cell: Cell) {
    page.children.push(cell);
    this.nodeMap.set(cell.id, cell);
  }

  removeCell(page: Page, cell: Cell) {
    page.children = page.children.filter((c) => c.id !== cell.id);
    this.nodeMap.delete(cell.id);
  }
}
