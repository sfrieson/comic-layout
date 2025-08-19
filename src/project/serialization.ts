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

function migrateProject(parsed: Record<string, unknown>) {
  switch (parsed.meta.version) {
    case 3:
      parsed = removeArtboards(parsed);
      parsed.meta.version = 4;
      return parsed;
  }
  return parsed as unknown;
}

const CURRENT_SERIALIZATION_VERSION = 4;

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

function removeArtboards(project: unknown) {
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
