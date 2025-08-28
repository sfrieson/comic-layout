import { openDB } from "idb";

const fileHandlesDB = openDB("file-handles", 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("project-files")) {
      db.createObjectStore("project-files", { autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("project-assets")) {
      db.createObjectStore("project-assets", { autoIncrement: true });
    }
  },
});

export const projectFilesTable = {
  bulkGetProjects: async function () {
    const db = await fileHandlesDB;
    return db.getAll("project-files");
  },
  putProjectFile: async function (project: FileSystemFileHandle[]) {
    const db = await fileHandlesDB;
    return db.put("project-files", project);
  },
};

export const projectAssetsTable = {
  bulkGetAssets: async function (assetIds: IDBValidKey[]) {
    const db = await fileHandlesDB;
    return db.getAll("project-assets", assetIds);
  },

  getAsset: async function (assetId: IDBValidKey) {
    const db = await fileHandlesDB;
    return db.get("project-assets", assetId);
  },

  saveAsset: async function (asset: File) {
    const db = await fileHandlesDB;
    return db.put("project-assets", asset);
  },
};
