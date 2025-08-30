// @ts-nocheck
export function migrateProject(
  parsed: Record<string, unknown> & { meta: { version: number } },
) {
  parsed = JSON.parse(JSON.stringify(parsed)); // deep clone to allow for safe mutations
  /* eslint-disable no-fallthrough */
  // migrations should start at the correct version, and run all the rest
  switch (parsed.meta.version) {
    case 3:
      parsed = removeArtboards(parsed);
      parsed.meta.version = 4;
    case 4:
      parsed = migratePageFills(parsed);
      parsed.meta.version = 5;
  }
  /* eslint-enable no-fallthrough */
  return parsed as unknown;
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
function migratePageFills(
  parsed: Record<string, unknown> & { meta: { version: number } },
): Record<string, unknown> & { meta: { version: number } } {
  for (const node of parsed.nodes) {
    if (node.color) {
      node.fills = [{ type: "color", value: node.fill, opacity: 1 }];
      delete node.color;
    }
  }
  return parsed;
}
