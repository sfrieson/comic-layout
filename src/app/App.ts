import { createStore, useStore } from "zustand";

import { createProjectStore } from "../project/Project.js";
import type { Project } from "../project/types.js";
import { Viewport } from "./Viewport.js";
import { expect } from "../utils/assert.js";

interface AppState {
  fileHandle: FileSystemFileHandle | null;
  project: ReturnType<typeof createProjectStore> | null;
  canvas: HTMLCanvasElement | null;
  viewport: Viewport | null;
  selection: Selection | null;
  registerCanvas: (canvas: HTMLCanvasElement) => void;
  unregisterCanvas: (canvas: HTMLCanvasElement) => void;
  createProject: (json?: string) => void;
  openFile: () => Promise<void>;
  newFile: () => Promise<void>;
  saveProject: () => void;
}

export const store = createStore<AppState>(() => {
  const onProjectStateChange = (state: Project) => {
    store.getState().saveProject();
  };

  let unsubscriptToProject: () => void;

  let writesArePending = false;

  async function saveProject() {
    writesArePending = true;
    const project = store.getState().project;
    const fileHandle = store.getState().fileHandle;
    if (!project || !fileHandle) return;
    const data = new Blob([project.actions.toJSON()], {
      type: "application/json",
    });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  const appState: AppState = {
    fileHandle: null,
    project: null,
    canvas: null,
    viewport: null,
    selection: null,
    registerCanvas: (canvas: HTMLCanvasElement) => {
      store.setState({ canvas, viewport: new Viewport(canvas) });
    },
    unregisterCanvas: (canvas: HTMLCanvasElement) => {
      store.setState((state) =>
        state.canvas === canvas ? { canvas: null, viewport: null } : state,
      );
    },
    async newFile() {
      const fileHandle = await window.showSaveFilePicker({
        types: [
          {
            description: "Comic Layout File",
            accept: { "application/json": [".json"] },
          },
        ],
        suggestedName: "NewComic.json",
        startIn: "desktop",
      });
      const data = new Blob([JSON.stringify(store.getState().project)], {
        type: "application/json",
      });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      store.setState({ fileHandle });
      store.getState().createProject(JSON.stringify(store.getState().project));
    },

    async openFile() {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Comic Layout File",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();

      const reader = new FileReader();
      reader.onload = (e) => {
        const string = e.target?.result as string;
        store.setState({ fileHandle });
        store.getState().createProject(string);
      };

      reader.onerror = (e) => {
        store.setState({ fileHandle: null });
        console.error(e);
      };
      reader.readAsText(file);
    },

    createProject(json?: string) {
      const project = createProjectStore();
      if (json) project.actions.loadFile(json);

      unsubscriptToProject?.();
      store.setState({ project });
      unsubscriptToProject = project.store.subscribe(onProjectStateChange);
    },

    saveProject() {
      // throttled
      if (writesArePending) return;
      writesArePending = true;
      const saveNow = () => {
        clearTimeout(timeout);
        window.removeEventListener("beforeunload", saveNow);

        saveProject();
      };

      const timeout = setTimeout(() => {
        writesArePending = false;
      }, 10_000);
      window.addEventListener("beforeunload", saveNow);
    },
  };

  return appState;
});

export function useAppStore<T>(selector: (state: AppState) => T) {
  return useStore(store, selector);
}

export function useProject() {
  const project = expect(
    useAppStore((s) => s.project),
    "Project not found",
  );

  return project;
}

export function useProjectStore<T>(selector: (state: Project) => T) {
  const project = useProject();

  return useStore(project.store, selector);
}
