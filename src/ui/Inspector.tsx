import { useStore } from "zustand";
import { store, useProject } from "../app/App.js";
import { addPage, setName, setPageDimensions } from "../app/projectActions.js";
import { useRecentFiles } from "../app/hooks.js";

export function Inspector() {
  const selection = useStore(store, (s) => s.selection);
  if (!selection) return <ProjectInspector />;
  return <div>Selection Inspector</div>;
}

function ProjectInspector() {
  const project = useStore(store, (s) => s.project);

  if (!project) return <IdleInspector />;

  return <LoadedProjectInspector />;
}

function IdleInspector() {
  const { recentFiles, addRecentFile } = useRecentFiles();
  const newFile = useStore(store, (s) => s.newFile);
  const openFile = useStore(store, (s) => s.openFile);
  console.log({ recentFiles });

  return (
    <div>
      <button
        onClick={async () => {
          const handle = await newFile();
          console.log({ savedHande: handle });
          addRecentFile(handle);
        }}
      >
        New Project
      </button>
      <button
        onClick={async () => {
          const handle = await openFile();
          console.log({ savedHande: handle });
          addRecentFile(handle);
        }}
      >
        Open Project
      </button>
      <div>
        {recentFiles?.map((file) => (
          <button key={file.name} onClick={() => openFile(file)}>
            {file.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadedProjectInspector() {
  const project = useProject();
  const name = project.meta.name;
  const pageWidth = project.pages.at(0)?.width ?? 1080;
  const pageHeight = project.pages.at(0)?.height ?? 1080;

  return (
    <div className="p-2">
      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <p>Page dimensions</p>
      <div className="flex gap-2">
        <label className="flex gap-2 items-center">
          <span>W:</span>
          <input
            className="w-full"
            type="number"
            value={pageWidth}
            onChange={(e) =>
              setPageDimensions(e.target.valueAsNumber, pageHeight)
            }
          />
        </label>

        <label className="flex gap-2 items-center">
          <span>H:</span>
          <input
            className="w-full"
            type="number"
            value={pageHeight}
            onChange={(e) =>
              setPageDimensions(pageWidth, e.target.valueAsNumber)
            }
          />
        </label>
      </div>

      <button onClick={() => addPage()}>Add Page</button>
    </div>
  );
}
