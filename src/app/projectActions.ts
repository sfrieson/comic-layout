import { store } from "./App.js";
import { assert, expect } from "../utils/assert.js";
import {
  Cell,
  createCell,
  createPage,
  Fill,
  Project,
  Node,
  Fills,
  createRectangle,
  createTextPathAligned as createPathAlignedText,
} from "../project/Project.js";
import { RenderQueue } from "../project/RenderQueue.js";
import { insertAtIndex } from "../utils/array.js";
import { Vec2, vec2Add, vec2Mult } from "../utils/vec2.js";
import { PropertySetter } from "../utils/types.js";
import { exportPages } from "./Exporter.js";

const requireProject = () =>
  expect(store.getState().project, "Project not found");

const requirePage = (pageId: string) => {
  const project = requireProject();
  const page = expect(project.nodeMap.get(pageId), "Page node not found");
  assert(page.type === "page", "Node is not a page");
  return page;
};

const requireCell = (cellId: string) => {
  const project = requireProject();
  const cell = expect(project.nodeMap.get(cellId), "Cell node not found");
  assert(cell.type === "cell", "Node is not a cell");
  return cell;
};

const listeners = new Set<(project: Project) => void>();

function requestRender() {
  const project = requireProject();
  project.meta._changes++;
  listeners.forEach((listener) => listener(project));
}

const uiUpdated = requestRender; // TODO: Only needs to update chrome, not the renderer
const projectUpdated = requestRender;

export function subscribeToChanges(listener: (project: Project) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const setName = (name: string) => {
  const { history } = store.getState();
  const originalName = requireProject().meta.name;
  history.add(
    history.actionSet(
      () => {
        requireProject().meta.name = name;
        uiUpdated();
      },
      () => {
        requireProject().meta.name = originalName;
        uiUpdated();
      },
    ),
  );
};

export const setPageDimensions = (width: number, height: number) => {
  const { history } = store.getState();
  const originalDimensions = Object.fromEntries(
    requireProject().pages.map((page) => [
      page.id,
      {
        width: page.width,
        height: page.height,
      },
    ]),
  );
  history.add(
    history.actionSet(
      () => {
        requireProject().pages.forEach((page) => {
          page.width = width;
          page.height = height;
        });
        projectUpdated();
      },
      () => {
        requireProject().pages.forEach((page) => {
          const { width, height } = expect(
            originalDimensions[page.id],
            "Original dimensions not found",
          );
          page.width = width;
          page.height = height;
        });
        projectUpdated();
      },
    ),
  );
};

const requireNodeWithFills = (nodeId: string) => {
  const node = requireNode(nodeId);
  assert("fills" in node, "Node does not have fills");
  return node as Extract<Node, { fills: RenderQueue<Fill> }>;
};

const requireNodeFill = (nodeId: string, fillIndex: number) => {
  const node = requireNodeWithFills(nodeId);
  const fill = expect(node.fills.at(fillIndex), "Fill not found");
  return fill;
};

export const setNodeFillAt = (
  nodeId: string,
  fillIndex: number,
  fill: PropertySetter<Fill, Fill>,
) => {
  const { history } = store.getState();
  const originalFill = requireNodeFill(nodeId, fillIndex);
  history.add(
    history.actionSet(
      () => {
        requireNodeWithFills(nodeId).fills.updateItem(fillIndex, fill);
        projectUpdated();
      },
      () => {
        requireNodeWithFills(nodeId).fills.updateItem(fillIndex, originalFill);
        projectUpdated();
      },
      {
        key: `node-${nodeId}-fill-${fillIndex}`,
      },
    ),
  );
};

export function saveImageToProject(assetId: number) {
  requireProject().images.add(assetId);
  uiUpdated();
}
export function setNodeOpacityAtIndex(
  nodeId: string,
  fillIndex: number,
  opacity: number,
) {
  const { history } = store.getState();
  const originalOpacity = requireNodeFill(nodeId, fillIndex).opacity;

  history.add(
    history.actionSet(
      () => {
        requireNodeFill(nodeId, fillIndex).opacity = opacity;
        projectUpdated();
      },
      () => {
        requireNodeFill(nodeId, fillIndex).opacity = originalOpacity;
        projectUpdated();
      },
    ),
  );
}

export function setNodeFillToType(
  nodeId: string,
  fillIndex: number,
  type: Fill["type"],
) {
  const { history } = store.getState();
  const originalFill = requireNodeFill(nodeId, fillIndex);
  history.add(
    history.actionSet(
      () => {
        let newFill: Fill;
        switch (type) {
          case "color":
            newFill = Fills.createColorFill();
            break;
          case "image":
            newFill = Fills.createImageFill();
            break;
          default:
            const _unreachable: never = type;
            throw new Error("Invalid fill type: " + _unreachable);
        }

        requireNodeWithFills(nodeId).fills.updateItem(fillIndex, newFill);
        projectUpdated();
      },
      () => {
        requireNodeWithFills(nodeId).fills.updateItem(fillIndex, originalFill);
        projectUpdated();
      },
    ),
  );
}

export const addNodeFill = (nodeId: string) => {
  const { history } = store.getState();
  const node = requireNodeWithFills(nodeId);
  history.add(
    history.actionSet(
      () => {
        node.fills.push({ type: "color", value: "#dddddd", opacity: 1 });
        projectUpdated();
      },
      () => {
        node.fills.removeItemAt(node.fills.length - 1);
        projectUpdated();
      },
    ),
  );
};

export const removeNodeFillAtIndex = (nodeId: string, fillIndex: number) => {
  const { history } = store.getState();
  const fill = { ...requireNodeFill(nodeId, fillIndex) };

  history.add(
    history.actionSet(
      () => {
        requireNodeWithFills(nodeId).fills.removeItemAt(fillIndex);
        projectUpdated();
      },
      () => {
        requireNodeWithFills(nodeId).fills.push(fill);
        projectUpdated();
      },
    ),
  );
};

export const addPage = () => {
  const { history, setActivePage } = store.getState();
  const existingPage = requireProject().pages.at(0) ?? {
    width: 1080,
    height: 1080,
  };
  const page = createPage({
    width: existingPage.width,
    height: existingPage.height,
  });

  history.add(
    history.actionSet(
      () => {
        const project = requireProject();
        project.addPage(page);
        setActivePage(page.id);
        projectUpdated();
      },
      () => {
        const project = requireProject();
        setActivePage("");
        project.removePage(page);
        projectUpdated();
      },
    ),
  );
};

export const removeNodeFromParent = (node: Node) => {
  const { history } = store.getState();
  assert("parent" in node, "Node does not have a parent");
  const parent = node.parent;
  const childIndex = parent?.children.indexOf(node);
  history.add(
    history.actionSet(
      () => {
        requireProject().nodeMap.get(parent.id)?.children.removeItem(node);
        projectUpdated();
      },
      () => {
        requireProject()
          .nodeMap.get(parent.id)
          ?.children.insertAt(childIndex, node);
        projectUpdated();
      },
    ),
  );
};

export const removePage = (pageId: string) => {
  const { history, setActivePage } = store.getState();
  const project = requireProject();

  const deletedPage = requirePage(pageId);
  const deletedPageIndex = expect(
    project.pages.indexOf(deletedPage),
    "Page not found in project pages",
  );
  history.add(
    history.actionSet(
      () => {
        const project = requireProject();

        setActivePage("");
        project.removePage(deletedPage);
        projectUpdated();
      },
      () => {
        const project = requireProject();
        project.nodeMap.set(pageId, deletedPage);
        project.pages = insertAtIndex(
          project.pages,
          deletedPageIndex,
          deletedPage,
        );
        setActivePage(pageId);
        projectUpdated();
      },
    ),
  );
};

export function addCellToPage(pageId: string) {
  const { history } = store.getState();
  const project = requireProject();
  const page = requirePage(pageId);
  const cell = createCell({ parent: page });

  history.add(
    history.actionSet(
      () => {
        project.addCell(page, cell);
        projectUpdated();
      },
      () => {
        project.removeCell(page, cell);
        projectUpdated();
      },
    ),
  );
}

export const scaleNode = (
  nodeId: string,
  scale: Vec2,
  translate: Vec2 = { x: 0, y: 0 },
) => {
  const { history } = store.getState();
  const node = requireNode(nodeId);

  let action;
  let undoAction;
  switch (node.type) {
    case "cell": {
      const cell = node;

      const originalPathPoints = cell.path.points;
      const originalTranslation = cell.translation;

      action = () => {
        cell.path.points = originalPathPoints.map((pt) => vec2Mult(pt, scale));
        cell.translation = vec2Add(originalTranslation, translate);
        projectUpdated();
      };
      undoAction = () => {
        cell.path.points = originalPathPoints;
        cell.translation = originalTranslation;
        projectUpdated();
      };
      break;
    }
    case "rectangle": {
      const rectangle = node;
      const originalTranslation = rectangle.translation;
      const originalWidth = rectangle.width;
      const originalHeight = rectangle.height;

      action = () => {
        rectangle.translation = vec2Add(originalTranslation, translate);
        rectangle.width = originalWidth * scale.x;
        rectangle.height = originalHeight * scale.y;
        projectUpdated();
      };
      undoAction = () => {
        rectangle.translation = originalTranslation;
        rectangle.width = originalWidth;
        rectangle.height = originalHeight;
        projectUpdated();
      };
      break;
    }
    case "text_path-aligned":
    case "page":
      throw new Error(`Node cannot be scaled: ${node.type}`);
    default: {
      const _unreachable: never = node;
      throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
      break;
    }
  }

  history.add(
    history.actionSet(action, undoAction, {
      key: `scale-node-${nodeId}`,
    }),
  );
};

export const setNodeTranslation = (nodeId: string, translation: Vec2) => {
  const { history } = store.getState();
  const node = requireNode(nodeId);
  const before = { ...node.translation };
  history.add(
    history.actionSet(
      () => {
        node.translation = translation;
        projectUpdated();
      },
      () => {
        node.translation = before;
        projectUpdated();
      },
    ),
  );
};

export function setNodeLines(nodeId: string, lines: string[]) {
  const { history } = store.getState();
  const node = requireNode(nodeId);
  assert("lines" in node, `Cannot set lines on node. Type: ${node.type}`);

  const previousLines = Array.from(node.lines);
  history.add(
    history.actionSet(
      () => {
        node.lines = lines;
        projectUpdated();
      },
      () => {
        node.lines = previousLines;
        projectUpdated();
      },
      { key: `node-${node.id}-set-lines` },
    ),
  );
}

export const translateNode = (nodeId: string, delta: Vec2) => {
  const { history } = store.getState();
  const node = requireNode(nodeId);
  const before = { ...node.translation };

  history.add(
    history.actionSet(
      () => {
        node.translation.x += delta.x;
        node.translation.y += delta.y;
        projectUpdated();
      },
      () => {
        node.translation = before;
        projectUpdated();
      },
    ),
  );
};

export const addRectangle = (nodeId: string) => {
  const { history } = store.getState();
  const node = requireNode(nodeId);
  const rectangle = createRectangle({
    parent: node,
  });
  history.add(
    history.actionSet(
      () => {
        node.children.push(rectangle);
        requireProject().nodeMap.set(rectangle.id, rectangle);
        projectUpdated();
      },
      () => {
        node.children.removeItem(rectangle);
        requireProject().nodeMap.delete(rectangle.id);
        projectUpdated();
      },
    ),
  );
};

export const addPathAlignedText = (nodeId: string) => {
  const { history } = store.getState();
  const parent = requireNode(nodeId);
  const pathAlignedText = createPathAlignedText({ parent });

  history.add(
    history.actionSet(
      () => {
        parent.children.push(pathAlignedText);
        requireProject().nodeMap.set(pathAlignedText.id, pathAlignedText);
        projectUpdated();
      },
      () => {
        parent.children.removeItem(pathAlignedText);
        requireProject().nodeMap.delete(pathAlignedText.id);
        projectUpdated();
      },
    ),
  );
};

function requireNode(nodeId: string) {
  const project = requireProject();
  return expect(project.nodeMap.get(nodeId), "Node not found");
}

export function exportProject() {
  const project = requireProject();
  const name = store.getState().fileHandle?.name.split(".")[0];
  exportPages(project, name);
}
