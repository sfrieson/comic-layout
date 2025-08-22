import { expectSerializedNode } from "./serialization.js";
import {
  SerializedCell,
  SerializedNode,
  SerializedPage,
  SerializedProject,
} from "./types.js";
import { v4 as uuid } from "uuid";

type SeralizedNodeMap = Map<string, SerializedNode>;
export class Page {
  type = "page" as const;
  id: string;
  name: string;
  width: number;
  height: number;
  color: string;
  children: Node[];

  constructor(opt: {
    id: string;
    name?: string;
    width: number;
    height: number;
    color?: string;
    children?: Node[];
  }) {
    this.id = opt.id;
    this.name = opt.name ?? "Page";
    this.width = opt.width;
    this.height = opt.height;
    this.color = opt.color ?? "#fff";
    this.children = opt.children ?? [];
  }

  static create(opt: {
    width: number;
    height: number;
    color?: string;
    children?: Node[];
  }) {
    return new Page({
      ...opt,
      id: uuid(),
    });
  }

  static fromSerialized(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedPage,
  ) {
    const page = new Page(serialized);

    return page;
  }
}

export class Cell {
  type = "cell" as const;
  id: string;
  translation: { x: number; y: number };
  children: Node[];

  constructor(opt: {
    id: string;
    translation?: { x: number; y: number };
    children?: Node[];
  }) {
    this.id = opt.id;
    this.translation = opt.translation ?? { x: 0, y: 0 };
    this.children = opt.children ?? [];
  }

  static create(opt: {
    translation?: { x: number; y: number };
    children?: Node[];
  }) {
    return new Cell({
      id: uuid(),
      ...opt,
    });
  }

  static fromSerialized(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedCell,
  ) {
    const cell = new Cell(serialized);
    return cell;
  }
}

export type Node = Page | Cell;

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
}
