import { createStore } from "zustand";
import { Project, serializedProjectSchema } from "./types.js";
import { v4 as uuid } from "uuid";

const CURRENT_VERSION = 1;

const INSTAGRAM_MAX = 1080;

// Instagram thumbnail crop is 3:4

export function initProject(): Project {
  const date = new Date().toISOString();
  return {
    name: "New Project",
    pages: [
      {
        id: uuid(),
        name: "Page 1",
        artboard: {
          id: uuid(),
          width: INSTAGRAM_MAX,
          height: INSTAGRAM_MAX,
        },
      },
    ],
    pageWidth: INSTAGRAM_MAX,
    pageHeight: INSTAGRAM_MAX,
    meta: {
      createdAt: date,
      updatedAt: date,
      version: CURRENT_VERSION,
    },
  };
}

export function loadProjectFile(json: string) {
  const data = JSON.parse(json);

  const parsed = serializedProjectSchema.parse(data);

  const pageWidth = parsed.pages.at(0)?.artboard.width ?? INSTAGRAM_MAX;
  const pageHeight = parsed.pages.at(0)?.artboard.height ?? INSTAGRAM_MAX;

  const project: Project = {
    ...parsed,
    pageWidth,
    pageHeight,
    meta: {
      ...parsed.meta,
      updatedAt: new Date().toISOString(),
    },
  };

  return project;
}

export const createProjectStore = (initialState = initProject()) => {
  const store = createStore(() => initialState);

  const projectActions = {
    toJSON() {
      const { pageWidth, pageHeight, ...state } = store.getState();
      return JSON.stringify(state);
    },

    setName(name: string) {
      store.setState({ name });
    },

    setPageDimensions(width: number, height: number) {
      console.log("setPageDimensions", width, height);
      store.setState((s) => ({
        pageWidth: width,
        pageHeight: height,
        pages: s.pages.map((page) => ({
          ...page,
          artboard: { ...page.artboard, width, height },
        })),
      }));
    },
  };

  return {
    store,
    actions: projectActions,
  };
};
