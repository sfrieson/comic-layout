import { useHotkeys } from "react-hotkeys-hook";

import { store as app } from "./App.js";
import { openDB } from "idb";
import { useCallback, useEffect, useState } from "react";

export function useAppHotkeys() {
  useHotkeys("meta+o", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().openFile();
  });
  useHotkeys("meta+n", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().newFile();
  });
  useHotkeys("meta+z", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().history.undo();
  });
  useHotkeys("meta+shift+z", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().history.redo();
  });
}

const fileHandlesDB = openDB("file-handles", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("handles")) {
      db.createObjectStore("handles", { autoIncrement: true });
    }
  },
});

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<FileSystemFileHandle[]>([]);
  useEffect(() => {
    async function loadAllHandles() {
      try {
        const db = await fileHandlesDB;
        const handles = (
          await db.getAll("handles")
        )[0] as FileSystemFileHandle[];
        setRecentFiles(handles);
      } catch (error) {
        console.error("Failed to load recent files:", error);
        setRecentFiles([]);
      }
    }
    loadAllHandles();
  }, []);

  const addRecentFile = useCallback((handle: FileSystemFileHandle) => {
    setRecentFiles((prev) => {
      const seenPaths = new Set([handle.name]);
      const next = [handle];
      for (const handle of prev) {
        if (seenPaths.has(handle.name)) {
          continue;
        }
        seenPaths.add(handle.name);
        next.push(handle);
        if (next.length >= 10) {
          break;
        }
      }
      saveHandle(next);
      return next;
    });
  }, []);

  return { recentFiles, addRecentFile };
}

async function saveHandle(handles: FileSystemFileHandle[]) {
  try {
    const db = await fileHandlesDB;
    await db.put("handles", handles);
  } catch (error) {
    console.error("Failed to save recent files:", error);
  }
}
