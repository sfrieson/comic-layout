import { assert } from "../utils/assert.js";
import {
  SerializedArtboard,
  SerializedNode,
  SerializedPage,
  SerializedProject,
} from "./types.js";
// import { v4 as uuid } from "uuid";

type SeralizedNodeMap = Map<string, SerializedNode>;

class Artboard {
  type = "artboard" as const;
  id: string;
  width: number;
  height: number;

  constructor(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedArtboard,
  ) {
    this.id = serialized.id;
    this.width = serialized.width;
    this.height = serialized.height;
  }
}
class Page {
  type = "page" as const;
  id: string;
  name: string;
  artboard: Artboard;

  constructor(
    project: Project,
    nodeMap: SeralizedNodeMap,
    serialized: SerializedPage,
  ) {
    this.id = serialized.id;
    this.name = serialized.name;
    const artboard = nodeMap.get(serialized.artboard);
    assert(artboard?.type === "artboard", "Artboard not found");
    this.artboard = new Artboard(project, nodeMap, artboard);
    project.nodeMap.set(this.artboard.id, this.artboard);
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
        const node = nodeMap.get(id);
        assert(node?.type === "page", `Page ${id} not found`);
        const page = new Page(this, nodeMap, node);
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
