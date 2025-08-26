import { store } from "./App.js";
import { assert, expect } from "../utils/assert.js";
import {
  Cell,
  createCell,
  createPage,
  Fill,
  Project,
  Node,
} from "../project/Project.js";
import { insertAtIndex } from "../utils/array.js";
import { vec2Add, vec2Mult } from "../utils/vec2.js";
import { PropertySetter } from "../utils/types.js";

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
  console.log("change!");
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
  return node as Extract<Node, { fills: Fill[] }>;
};

const requireNodeFill = (nodeId: string, fillIndex: number) => {
  const node = requireNodeWithFills(nodeId);
  const fill = expect(node.fills.at(fillIndex), "Fill not found");
  assert(fill.type === "color", "Not a color fill");
  return fill;
};

export const setNodeFillAtIndex = (
  nodeId: string,
  fillIndex: number,
  fill: PropertySetter<Fill>,
) => {
  const { history } = store.getState();
  const originalFill = requireNodeFill(nodeId, fillIndex);
  history.add(
    history.actionSet(
      () => {
        requireNodeWithFills(nodeId).setFill(fillIndex, fill);
        projectUpdated();
      },
      () => {
        requireNodeWithFills(nodeId).setFill(fillIndex, originalFill);
        projectUpdated();
      },
      {
        key: `node-${nodeId}-fill-${fillIndex}`,
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

export const removeCell = (cell: Cell) => {
  const { history } = store.getState();
  const parent = cell.parent;
  const childrenIndex = parent?.children.indexOf(cell);
  history.add(
    history.actionSet(
      () => {
        requireProject().removeCell(parent, cell);
        projectUpdated();
      },
      () => {
        requireProject().addCell(parent, cell, childrenIndex);
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

export const scaleCell = (
  cellId: string,
  scale: { x: number; y: number },
  translate: { x: number; y: number } = { x: 0, y: 0 },
) => {
  const { history } = store.getState();
  const cell = requireCell(cellId);

  const originalPathPoints = cell.path.points;
  const originalTranslation = cell.translation;

  history.add(
    history.actionSet(
      () => {
        cell.path.points = originalPathPoints.map((pt) => vec2Mult(pt, scale));
        cell.translation = vec2Add(originalTranslation, translate);
        projectUpdated();
      },
      () => {
        cell.path.points = originalPathPoints;
        cell.translation = originalTranslation;
        projectUpdated();
      },
      {
        key: `scale-cell-${cellId}`,
      },
    ),
  );
};

export const translateCell = (
  cellId: string,
  delta: { x: number; y: number },
) => {
  const { history } = store.getState();
  const cell = requireCell(cellId);
  const before = { ...cell.translation };

  history.add(
    history.actionSet(
      () => {
        cell.translation.x += delta.x;
        cell.translation.y += delta.y;
        projectUpdated();
      },
      () => {
        cell.translation = before;
        projectUpdated();
      },
    ),
  );
};

function requireNode(nodeId: string) {
  const project = requireProject();
  return expect(project.nodeMap.get(nodeId), "Node not found");
}
