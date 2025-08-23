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
      break;
    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

export function serializeProject(project: Project): SerializedProject {
  const nodes: SerializedNode[] = [];
  traverse(project.pages, (node) => {
    switch (node.type) {
      case "page":
        nodes.push({
          ...node,
        });
        break;
      case "cell":
        nodes.push({
          ...node,
        });
        break;
      default: {
        const _unreachable: never = node;
        throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
      }
    }
  });
  return {
    pages: project.pages.map((page) => page.id),
    nodes,
    meta: {
      ...project.meta,
      updatedAt: new Date().toISOString(),
      version: CURRENT_SERIALIZATION_VERSION,
    },
  };
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
