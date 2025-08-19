import { SerializedNode, serializedProjectSchema } from "./types.js";
import { Project, Node } from "./Project.js";

// const INSTAGRAM_MAX = 1080;

// Instagram thumbnail crop is 3:4

export function loadProjectFile(json?: string): Project {
  let parsed = null;

  if (json) {
    const data = json ? JSON.parse(json) : null;

    const migrated = migrateProject(data);

    parsed = serializedProjectSchema.parse(migrated);
  }

  return new Project(parsed);
}

function migrateProject<T>(parsed: T) {
  // TODO
  return parsed;
}

const CURRENT_SERIALIZATION_VERSION = 3;

export function serializeProject(project: Project) {
  function traverse(
    node: Node | Node[],
    nodes: SerializedNode[] = [],
  ): SerializedNode[] {
    if (Array.isArray(node)) {
      return node.flatMap((n) => traverse(n, nodes));
    }
    if (node.type === "page") {
      nodes.push({
        ...node,
        artboard: node.artboard.id,
      });
      traverse(node.artboard, nodes);
    } else if (node.type === "artboard") {
      nodes.push({
        ...node,
      });
    } else {
      const _exhaustive: never = node;
      throw new Error(`Unknown node type: ${(_exhaustive as Node).type}`);
    }
    return nodes;
  }
  return {
    version: CURRENT_SERIALIZATION_VERSION,
    pages: project.pages.map((page) => page.id),
    nodes: traverse(project.pages),
    meta: {
      ...project.meta,
      updatedAt: new Date().toISOString(),
      version: CURRENT_SERIALIZATION_VERSION,
    },
  };
}
