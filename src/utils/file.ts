export async function createFile(name: string) {
  const handle = await window.showSaveFilePicker({
    types: [
      {
        description: "Comic Layout File",
        accept: { "application/json": [".json"] },
      },
    ],
    suggestedName: name,
    startIn: "desktop",
  });

  await handle.requestPermission({ mode: "readwrite" });

  return handle;
}

export async function openFile() {
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

  return fileHandle;
}

export async function readFile(fileHandle: FileSystemFileHandle) {
  const { promise, resolve, reject } = Promise.withResolvers<string>();

  const permission = await fileHandle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted") {
    await fileHandle.requestPermission({ mode: "readwrite" });
  }

  const file = await fileHandle.getFile();

  const reader = new FileReader();
  reader.onload = (e) => {
    const string = e.target?.result as string;

    resolve(string);
  };

  reader.onerror = reject;
  reader.readAsText(file);

  return promise;
}

export async function writeFile(
  fileHandle: FileSystemFileHandle,
  json: string,
) {
  const data = new Blob([json], {
    type: "application/json",
  });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}
