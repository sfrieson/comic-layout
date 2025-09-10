import { store } from "./App.js";
import { assert, expect } from "../utils/assert.js";
import { v4 as uuid } from "uuid";
import {
  createCell,
  createPage,
  Fill,
  Project,
  Node,
  Fills,
  createRectangle,
  createTextPathAligned as createPathAlignedText,
  nodeFromSerialized,
} from "../project/Project.js";
import { RenderQueue } from "../project/RenderQueue.js";
import { Vec2, vec2Add, vec2Mult, vec2Sub } from "../utils/vec2.js";
import { PropertySetter } from "../utils/types.js";
import { exportPages } from "./Exporter.js";
import { traverseSerializedNode } from "../project/traverse.js";
import { serializeNode } from "../project/serialization.js";
import { SerializedNode } from "../project/types.js";
import {
  requirePage,
  requirePageDimensions,
  requireProject,
} from "./projectSelectors.js";

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
  const originalDimensions = requirePageDimensions();

  history.add(
    history.actionSet(
      () => {
        for (const [_, page] of requireProject().nodeMap) {
          if (page.type !== "page") continue;
          page.width = width;
          page.height = height;
        }
        projectUpdated();
      },
      () => {
        for (const [_, page] of requireProject().nodeMap) {
          if (page.type !== "page") return;
          page.width = originalDimensions.width;
          page.height = originalDimensions.height;
        }
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
        node.fills.addToTop({ type: "color", value: "#dddddd", opacity: 1 });
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
        requireNodeWithFills(nodeId).fills.addToTop(fill);
        projectUpdated();
      },
    ),
  );
};

export const addPage = () => {
  const { history, setActivePage } = store.getState();
  const existingPage = requirePageDimensions();

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
  const { history, ui } = store.getState();
  assert("parent" in node, "Node does not have a parent");
  const parentOrProject = node.parent ?? requireProject();
  const childIndex = parentOrProject.children.indexOf(node);
  history.add(
    history.actionSet(
      () => {
        ui.selection.delete(node);
        const parent = node.parent
          ? requireNode(node.parent.id)
          : requireProject();
        parent.children.removeItem(node);
        projectUpdated();
      },
      () => {
        ui.selection.add(node);
        const parent = node.parent
          ? requireNode(node.parent.id)
          : requireProject();
        parent.children.insertAt(childIndex, node);
        projectUpdated();
      },
    ),
  );
};

export const removePage = (pageId: string) => {
  const { history, setActivePage } = store.getState();
  const project = requireProject();

  const deletedPage = requirePage(pageId);
  const deletedPageIndex = project.children.indexOf(deletedPage);
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
        project.children.insertAt(deletedPageIndex, deletedPage);
        setActivePage(pageId);
        projectUpdated();
      },
    ),
  );
};

export function addCellToPage(pageId: string) {
  const { history, ui } = store.getState();
  const project = requireProject();
  const page = requirePage(pageId);
  const cell = createCell({ parent: page });

  history.add(
    history.actionSet(
      () => {
        project.addCell(page, cell);
        ui.selection = new Set([cell]);

        projectUpdated();
      },
      () => {
        ui.selection.delete(cell);
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

export const moveTo = (node: { translation: Vec2 }, translation: Vec2) => {
  const { history } = store.getState();
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

export interface FontInfo {
  fontSize: number;
  lineHeight: number;
}
export function setNodeFontInfo(nodeId: string, fontInfo: FontInfo) {
  const { history } = store.getState();
  const node = requireNode(nodeId);
  assert("lines" in node, `Cannot set lines on node. Type: ${node.type}`);

  const previousInfo: FontInfo = { ...node };

  history.add(
    history.actionSet(
      () => {
        node.fontSize = fontInfo.fontSize;
        node.lineHeight = fontInfo.lineHeight;
        projectUpdated();
      },
      () => {
        node.fontSize = previousInfo.fontSize;
        node.lineHeight = previousInfo.lineHeight;
        projectUpdated();
      },
      { key: `node-${node.id}-update-font-info` },
    ),
  );
}

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

export const translateBy = (
  node: { id: string; translation: Vec2 },
  delta: Vec2,
) => {
  const { history } = store.getState();
  const translation = { ...node.translation };

  history.add(
    history.actionSet(
      () => {
        node.translation = vec2Add(translation, delta);
        projectUpdated();
      },
      () => {
        node.translation = vec2Sub(translation, delta);
        projectUpdated();
      },
      { key: `translate-node-${node.id}` },
    ),
  );
};

export const addRectangle = (nodeId: string) => {
  const { history, ui } = store.getState();
  const node = requireNode(nodeId);
  const rectangle = createRectangle({
    parent: node,
  });
  history.add(
    history.actionSet(
      () => {
        node.children.addToTop(rectangle);
        requireProject().nodeMap.set(rectangle.id, rectangle);
        ui.selection = new Set([rectangle]);
        projectUpdated();
      },
      () => {
        ui.selection.delete(rectangle);
        node.children.removeItem(rectangle);
        requireProject().nodeMap.delete(rectangle.id);
        projectUpdated();
      },
    ),
  );
};

export const addPathAlignedText = (nodeId: string) => {
  const { history, ui } = store.getState();
  const parent = requireNode(nodeId);
  const pathAlignedText = createPathAlignedText({ parent });

  history.add(
    history.actionSet(
      () => {
        parent.children.addToTop(pathAlignedText);
        requireProject().nodeMap.set(pathAlignedText.id, pathAlignedText);
        ui.selection = new Set([pathAlignedText]);
        projectUpdated();
      },
      () => {
        ui.selection.delete(pathAlignedText);
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

export function bringNodeForward(nodeId: string) {
  const node = requireNode(nodeId);
  const parent = expect(node.parent, "Node does not have a parent");
  const startingIndex = parent.children.indexOf(node);
  if (startingIndex === 0) {
    console.warn("swapping out o fbounds");
    return;
  }

  const { history } = store.getState();
  history.add(
    history.actionSet(
      () => {
        parent.children.swapWithPrevious(node);
        projectUpdated();
      },
      () => {
        parent.children.swapWithNext(node);
        projectUpdated();
      },
    ),
  );
}

export function sendNodeBackward(nodeId: string) {
  const node = requireNode(nodeId);
  const parent = expect(node.parent, "Node does not have a parent");
  const startingIndex = parent.children.indexOf(node);
  if (startingIndex === parent.children.length - 1) {
    console.warn("swapping out o fbounds");
    return;
  }

  const { history } = store.getState();
  history.add(
    history.actionSet(
      () => {
        parent.children.swapWithNext(node);
        projectUpdated();
      },
      () => {
        parent.children.swapWithPrevious(node);
        projectUpdated();
      },
    ),
  );
}

export function duplicateNode(nodeId: string) {
  const originalNode = requireNode(nodeId);
  const serializedNodes = JSON.parse(
    JSON.stringify(serializeNode(originalNode)),
  );
  const project = requireProject();
  const parent = originalNode.parent ?? project;
  const index = parent.children.indexOf(originalNode);
  // map IDs
  const oldNewIdMap = new Map<string, SerializedNode>();
  const idMap = new Map<string, SerializedNode>();
  traverseSerializedNode(serializedNodes, nodeId, (node) => {
    const oldId = node.id;
    node.id = uuid();
    oldNewIdMap.set(oldId, node);
    idMap.set(node.id, node);
  });
  traverseSerializedNode(
    serializedNodes,
    oldNewIdMap.get(nodeId)!.id,
    (node) => {
      node.children = node.children.map(
        (childId) => expect(oldNewIdMap.get(childId), "Child not found").id,
      );
    },
  );

  const { history } = store.getState();
  history.add(
    history.actionSet(
      () => {
        nodeFromSerialized(
          requireProject(),
          idMap,
          oldNewIdMap.get(nodeId)!,
          originalNode.parent,
        );
        const newNode = requireNode(
          expect(oldNewIdMap.get(nodeId)!.id, "Node not found in map"),
        );
        parent.children.insertAt(index, newNode);
        requireProject().nodeMap.set(newNode.id, newNode);
        projectUpdated();
      },
      () => {
        const newNode = requireNode(
          expect(oldNewIdMap.get(nodeId)!.id, "Node not found in map"),
        );
        newNode.parent?.children.removeItem(newNode);
        requireProject().nodeMap.delete(newNode.id);
        projectUpdated();
      },
    ),
  );
}
