import {
  SerializedNode,
  SerializedProject,
  serializedProjectSchema,
} from "./types.js";
import { Project, Node } from "./Project.js";
import { assert } from "../utils/assert.js";
import { migrateProject } from "./migrations.js";

// const INSTAGRAM_MAX = 1080;

// Instagram thumbnail crop is 3:4

const CURRENT_SERIALIZATION_VERSION = 5;

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

function traverse(node: Node | Node[], fn: (node: Node) => void) {
  if (Array.isArray(node)) {
    node.forEach((n) => traverse(n, fn));
    return;
  }

  fn(node);

  switch (node.type) {
    case "page":
    case "cell":
      traverse(node.children.toArray(), fn);
      break;
    // Below don't actually have children but are included for completeness
    case "rectangle":
    case "text_path-aligned":
      traverse(node.children.toArray(), fn);
      break;
    default: {
      const _unreachable: never = node;
      throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
    }
  }
}

export function serializeProject(project: Project): SerializedProject {
  const nodes: SerializedNode[] = [];
  traverse(project.pages, (node) => {
    switch (node.type) {
      case "page": {
        nodes.push({
          ...node,
          fills: node.fills.toArray(),
          children: node.children.toArray().map((child) => child.id),
        });
        break;
      }
      case "cell": {
        const { parent, ...rest } = node;
        nodes.push({
          ...rest,
          fills: node.fills.toArray(),
          children: node.children.toArray().map((child) => child.id),
        });
        break;
      }
      case "rectangle": {
        const { parent, ...rest } = node;
        nodes.push({
          ...rest,
          fills: node.fills.toArray(),
          children: node.children.toArray().map((child) => child.id),
        });
        break;
      }
      case "text_path-aligned": {
        const { parent, ...rest } = node;
        nodes.push({
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
  return {
    pages: project.pages.map((page) => page.id),
    nodes,
    images: Array.from(project.images),
    meta: {
      ...project.meta,
      updatedAt: new Date().toISOString(),
      version: CURRENT_SERIALIZATION_VERSION,
    },
  };
}
