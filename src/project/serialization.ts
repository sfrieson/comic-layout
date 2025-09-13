import {
  SerializedNode,
  SerializedProject,
  serializedProjectSchema,
} from "./types.js";
import { Project, Node } from "./Project.js";
import { assert } from "../utils/assert.js";
import { migrateProject } from "./migrations.js";
import { traverse } from "./traverse.js";

// const INSTAGRAM_MAX = 1080;

// Instagram thumbnail crop is 3:4

const CURRENT_SERIALIZATION_VERSION = 6;

export function loadProjectFile(json?: string): Project {
  let parsed = null;

  if (json) {
    const data = json ? JSON.parse(json) : null;

    const migrated = migrateProject(data);

    parsed = serializedProjectSchema.parse(migrated);

    assert(
      parsed.meta.version === CURRENT_SERIALIZATION_VERSION,
      `Project version mismatch: ${parsed.meta.version} !== ${CURRENT_SERIALIZATION_VERSION}`,
    );
  }

  return new Project(parsed);
}

export function serializeNode(
  node: Node | Node[],
  serializedNodes: SerializedNode[] = [],
): SerializedNode[] {
  traverse(node, (node) => {
    const { parent, ...rest } = node;
    switch (node.type) {
      case "page":
      case "cell":
      case "rectangle":
      case "text_path-aligned":
      case "duplicated": {
        serializedNodes.push({
          ...rest,
          fills: node.fills.toArray(),
          children: node.children.toArray().map((child) => child.id),
        });
        break;
      }
      default: {
        const _unreachable: never = node;
        throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
      }
    }
  });

  return serializedNodes;
}

export function serializeProject(project: Project): SerializedProject {
  return {
    children: project.children.toArray().map((node) => node.id),
    nodes: serializeNode(project.children.toArray()),
    images: Array.from(project.images),
    meta: {
      ...project.meta,
      updatedAt: new Date().toISOString(),
      version: CURRENT_SERIALIZATION_VERSION,
    },
  };
}
