import { assert } from "../utils/assert.js";
import { SerializedNode, SerializedPage, SerializedProject } from "./types.js";
import { v4 as uuid } from "uuid";

type SeralizedNodeMap = Map<string, SerializedNode>;
export class Page {
  type = "page" as const;
  id: string;
  name: string;
  width: number;
  height: number;
  color: string;

  constructor(opt: {
    id: string;
    name?: string;
    width: number;
    height: number;
    color?: string;
  }) {
    this.id = opt.id;
    this.name = opt.name ?? "Page";
    this.width = opt.width;
    this.height = opt.height;
    this.color = opt.color ?? "#fff";
  }

  static create(opt: { width: number; height: number }) {
    return new Page({
      id: uuid(),
      width: opt.width,
      height: opt.height,
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

export type Node = Page;

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

if (import.meta.hot) {
  import.meta.hot.accept();
}
