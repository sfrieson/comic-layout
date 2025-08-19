import { useStore } from "zustand";
import { store, useProject } from "../app/App.js";
import { addPage, setName, setPageDimensions } from "../app/projectActions.js";

export function Inspector() {
  const selection = useStore(store, (s) => s.selection);
  if (!selection) return <ProjectInspector />;
  return <div>Selection Inspector</div>;
}

function ProjectInspector() {
  const project = useStore(store, (s) => s.project);
  const newFile = useStore(store, (s) => s.newFile);
  const openFile = useStore(store, (s) => s.openFile);

  if (!project)
    return (
      <div>
        <button onClick={() => newFile()}>New Project</button>
        <button onClick={() => openFile()}>Open Project</button>
      </div>
    );

  return <LoadedProjectInspector />;
}

function LoadedProjectInspector() {
  const project = useProject();
  const name = project.meta.name;
  const pageWidth = project.pages.at(0)?.artboard.width ?? 1080;
  const pageHeight = project.pages.at(0)?.artboard.height ?? 1080;

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
