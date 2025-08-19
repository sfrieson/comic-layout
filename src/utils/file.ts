export async function createFile(name: string) {
  return await window.showSaveFilePicker({
    types: [
      {
        description: "Comic Layout File",
        accept: { "application/json": [".json"] },
      },
    ],
    suggestedName: name,
    startIn: "desktop",
  });
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
