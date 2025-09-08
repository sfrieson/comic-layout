import { createStore } from "zustand";
import { combine } from "zustand/middleware";

import { Viewport } from "./Viewport.js";
import { assert } from "../utils/assert.js";
import type { Node, Project } from "../project/Project.js";
import { loadProjectFile, serializeProject } from "../project/serialization.js";
import { createFile, openFile, readFile, writeFile } from "../utils/file.js";
import { createHistory } from "../history/history.js";
import { Vec2 } from "../utils/vec2.js";

export const SAVING_DISABLED = true;

export const store = createStore(
  combine(
    {
      fileHandle: null as FileSystemFileHandle | null,
      project: null as Project | null,
      viewport: null as Viewport | null,
      history: createHistory(),
      selection: Set<Node>,
      ui: {
        zoom: 1,
        pan: { x: 0, y: 0 },
        canvasColor: "#ccc",
        activePage: "",
        selection: new Set<Node>(),
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

        const permission = await fileHandle.queryPermission({
          mode: "readwrite",
        });
        if (permission !== "granted") {
          await fileHandle.requestPermission({ mode: "readwrite" });
        }

        const json = JSON.stringify(serializeProject(project));
        writesArePending = false; // Now the project data is serialized, any changes need to be picked up
        if (SAVING_DISABLED) {
          console.warn("Saving is disabled");
          console.warn(json);
          return;
        }
        await writeFile(fileHandle, json);
        console.info("saved");
      }

      function createProject(json?: string) {
        set({ project: loadProjectFile(json) });
      }

      return {
        registerRoot: (root: HTMLElement) => {
          set({
            viewport: new Viewport(root),
          });
        },
        unregisterRoot: (root: HTMLElement) => {
          set({ viewport: null });
        },
        async newFile() {
          const fileHandle = await createFile("NewComic.json");
          set({ fileHandle });
          createProject();
          return fileHandle;
        },

        async openFile(fileHandle?: FileSystemFileHandle) {
          try {
            fileHandle ??= await openFile();

            const file = await readFile(fileHandle);
            set({ fileHandle });
            createProject(file);
            return fileHandle;
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
            writesArePending = false;
            saveProject();
            window.removeEventListener("beforeunload", saveNow);
          };

          const timeout = setTimeout(saveNow, 3_000);
          window.addEventListener("beforeunload", saveNow);
        },
        setZoom: (zoom: number, pan?: Vec2) => {
          if (zoom < 0.01 || zoom > 32) return;
          if (pan) {
            setUI({ zoom: Math.min(Math.max(0.01, zoom), 32), pan });
          } else {
            setUI({ zoom: Math.min(Math.max(0.01, zoom), 32) });
          }
        },
        setPan: (pan: Vec2) => {
          setUI({ pan: { x: Math.round(pan.x), y: Math.round(pan.y) } });
        },
        setActivePage: (activePage: string) => {
          setUI({ activePage, selection: new Set() });
        },
        setSelectedNodes: (selectedNodes: Node[]) => {
          setUI({ selection: new Set(selectedNodes) });
        },
      };
    },
  ),
);

// if (import.meta.hot) {
//   let viewport: Viewport | null = null;
//   let project: Project | null = null;
//   import.meta.hot.dispose(() => {
//     viewport = store.getState().viewport;
//     project = store.getState().project;
//   });
//   import.meta.hot.accept(() => {
//     console.log("App changed");
//     store.setState({
//       viewport,
//       project,
//     });
//   });
// }
