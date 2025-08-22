import {
  SerializedNode,
  SerializedProject,
  serializedProjectSchema,
} from "./types.js";
import { Project, Node } from "./Project.js";
import { assert } from "../utils/assert.js";

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

function migrateProject(
  parsed: Record<string, unknown> & { meta: { version: number } },
) {
  switch (parsed.meta.version) {
    case 3:
      parsed = removeArtboards(parsed);
      parsed.meta.version = 4;
      return parsed;
  }
  return parsed as unknown;
}

const CURRENT_SERIALIZATION_VERSION = 4;

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

function removeArtboards<T = unknown>(project: T) {
  const oldProject = project as {
    nodes: Array<
      | { type: "artboard"; id: string; width: number; height: number }
      | { type: "page"; id: string; artboard: string }
    >;
  };

  const artboardMap = oldProject.nodes
    .filter((node) => node.type === "artboard")
    .reduce(
      (acc, node) => {
        acc[node.id] = node;
        return acc;
      },
      {} as Record<
        string,
        { type: "artboard"; id: string; width: number; height: number }
      >,
    );

  const newProject = {
    ...oldProject,
    nodes: oldProject.nodes.flatMap((node) => {
      switch (node.type) {
        case "artboard":
          return [];
        case "page": {
          const { artboard: artboardId, ...rest } = node;
          const artboard = artboardMap[artboardId];
          return {
            ...rest,
            width: artboard?.width ?? 1080,
            height: artboard?.height ?? 1080,
          };
        }
        default:
          return node;
      }
    }),
  };

  return newProject;
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
