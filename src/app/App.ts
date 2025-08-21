import { createStore } from "zustand";
import { combine } from "zustand/middleware";

import { Viewport } from "./Viewport.js";
import { assert, expect } from "../utils/assert.js";
import type { Project } from "../project/Project.js";
import { loadProjectFile, serializeProject } from "../project/serialization.js";
import { useSyncExternalStore } from "react";
import { subscribeToChanges } from "./projectActions.js";
import { createFile, openFile, readFile, writeFile } from "../utils/file.js";
import { createHistory } from "../history/history.js";

export const store = createStore(
  combine(
    {
      fileHandle: null as FileSystemFileHandle | null,
      project: null as Project | null,
      canvas: null as HTMLCanvasElement | null,
      viewport: null as Viewport | null,
      history: createHistory(),
      selection: null as Selection | null,
      ui: {
        zoom: 1,
        pan: { x: 0, y: 0 },
        canvasColor: "#ccc",
        activePage: "",
      },
    },
    (set, get) => {
      const setUI = (ui: Partial<ReturnType<typeof get>["ui"]>) => {
        set({ ui: { ...get().ui, ...ui } });
      };
      let writesArePending = false;

      async function saveProject() {
        writesArePending = true;
        const { project, fileHandle } = get();

        assert(project, "No project found.");
        assert(fileHandle, "No file handle found.");
        const json = JSON.stringify(serializeProject(project));
        writesArePending = false; // Now the project data is serialized, any changes need to be picked up
        await writeFile(fileHandle, json);
      }

      function createProject(json?: string) {
        set({ project: loadProjectFile(json) });
      }

      return {
        registerCanvas: (canvas: HTMLCanvasElement) => {
          set({
            canvas,
            viewport: new Viewport(canvas),
          });
        },
        unregisterCanvas: (canvas: HTMLCanvasElement) => {
          set((state) =>
            state.canvas === canvas ? { canvas: null, viewport: null } : state,
          );
        },
        async newFile() {
          const fileHandle = await createFile("NewComic.json");
          set({ fileHandle });
          const project = createProject();
          return project;
        },

        async openFile() {
          try {
            const fileHandle = await openFile();

            const file = await readFile(fileHandle);
            set({ fileHandle });
            createProject(file);
          } catch (e) {
            set({ fileHandle: null });
            throw e;
          }
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
            saveProject();
          }, 10_000);
          window.addEventListener("beforeunload", saveNow);
        },
        setZoom: (zoom: number) => {
          setUI({ zoom: Math.min(Math.max(0.01, zoom), 32) });
        },
        setPan: (pan: { x: number; y: number }) => {
          setUI({ pan });
        },
        setActivePage: (activePage: string) => {
          setUI({ activePage });
        },
      };
    },
  ),
);

let cachedChange = { ["-1"]: null } as Record<number, Project | null>;

export function useProject() {
  const project = useSyncExternalStore(subscribeToChanges, () => {
    const project = expect(store.getState().project, "Project not found");

    const cached = cachedChange[project.meta._changes];
    if (cached) return cached;

    const newProject = { ...project };

    cachedChange = { [project.meta._changes]: newProject };
    return newProject;
  });

  return project;
}
