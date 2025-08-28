import { openDB } from "idb";
import z from "zod/v4";

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

// One row with an array of file handles
const projectFilesSchema = z.array(z.instanceof(FileSystemFileHandle));
export const projectFilesTable = {
  bulkGetProjects: async function () {
    const db = await fileHandlesDB;
    const row = await db.get("project-files", 1);
    return projectFilesSchema.parse(row ?? []);
  },
  putProjectFile: async function (
    projects: FileSystemFileHandle[],
  ): Promise<IDBValidKey> {
    const db = await fileHandlesDB;
    return db.put("project-files", projects, 1);
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
