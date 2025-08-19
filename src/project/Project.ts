import { assert } from "../utils/assert.js";
import {
  SerializedArtboard,
  SerializedNode,
  SerializedPage,
  SerializedProject,
} from "./types.js";
import { v4 as uuid } from "uuid";

type SeralizedNodeMap = Map<string, SerializedNode>;

export class Artboard {
  type = "artboard" as const;
  id: string;
  width: number;
  height: number;

  constructor(opt: { id: string; width: number; height: number }) {
    this.id = opt.id;
    this.width = opt.width;
    this.height = opt.height;
  }

  static create(opt: { width: number; height: number }) {
    return new Artboard({
      id: uuid(),
      width: opt.width,
      height: opt.height,
    });
  }
  static fromSerialized(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedArtboard,
  ) {
    return new Artboard(serialized);
  }
}
export class Page {
  type = "page" as const;
  id: string;
  name: string;
  artboard: Artboard;

  constructor(opt: { id: string; name: string; artboard: Artboard }) {
    this.id = opt.id;
    this.name = opt.name;
    this.artboard = opt.artboard;
  }

  static create(opt: { width: number; height: number }) {
    return new Page({
      id: uuid(),
      name: "New Page",
      artboard: Artboard.create(opt),
    });
  }
  static fromSerialized(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedPage,
  ) {
    const artboard = expectSerializedNode(
      nodeMap.get(serialized.artboard),
      "artboard",
    );

    const page = new Page({
      ...serialized,
      artboard: Artboard.fromSerialized(project, nodeMap, artboard),
    });
    project.nodeMap.set(page.artboard.id, page.artboard);

    return page;
  }
}

export type Node = Artboard | Page;

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

export function assertSerialzedNode<T extends SerializedNode["type"]>(
  node: SerializedNode | null | undefined,
  type: T,
): asserts node is Extract<SerializedNode, { type: T }> {
  assert(node?.type === type, `Node ${node?.id} is not a ${type}`);
}

export function expectSerializedNode<T extends SerializedNode["type"]>(
  node: SerializedNode | null | undefined,
  type: T,
) {
  assert(node?.type === type, `Node ${node?.id} is not a ${type}`);
  return node as Extract<SerializedNode, { type: T }>;
}
