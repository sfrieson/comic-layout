import { useHotkeys } from "react-hotkeys-hook";
import { projectAssetsTable, projectFilesTable } from "./db.js";

import { store as app } from "./App.js";
import { useCallback, useEffect, useState } from "react";

export function useEmptyStateHotkeys() {
  useHotkeys("meta+o", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().openFile();
  });
  useHotkeys("meta+n", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().newFile();
  });
}

export function useEditingHotKeys() {
  useHotkeys("meta+z", (e: KeyboardEvent) => {
    e.preventDefault();
    console.log("undo");
    app.getState().history.undo();
  });
  useHotkeys("meta+shift+z", (e: KeyboardEvent) => {
    e.preventDefault();
    app.getState().history.redo();
  });
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<FileSystemFileHandle[]>([]);
  useEffect(() => {
    async function loadAllHandles() {
      try {
        const handles = await projectFilesTable.bulkGetProjects();
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
    await projectFilesTable.putProjectFile(handles);
  } catch (error) {
    console.error("Failed to save recent files:", error);
  }
}

export const projectAssets = {
  useBulkGetAssets(assetIds: string[]) {
    const [assets, setAssets] = useState<File[] | null>(null);
    useEffect(() => {
      projectAssetsTable.bulkGetAssets(assetIds).then(setAssets);
      return () => {
        setAssets(null);
      };
    }, [assetIds]);
    return {
      loadingAssets: assets === null,
      assets,
    };
  },
  useGetAsset(assetId: number | null) {
    const [asset, setAsset] = useState<File | null>(null);
    useEffect(() => {
      if (assetId === null) return;
      projectAssetsTable.getAsset(assetId).then(setAsset);
      return () => {
        setAsset(null);
      };
    }, [assetId]);
    return {
      loadingAsset: asset === null,
      asset,
    };
  },
  useSaveAsset() {
    return {
      save({
        asset,
        onSuccess,
      }: {
        asset: File;
        onSuccess: (assetId: IDBValidKey) => void;
      }) {
        projectAssetsTable.saveAsset(asset).then(onSuccess);
      },
    };
  },
};
