import { useAppStore, useProjectStore } from "./App.js";

export function Inspector() {
  const selection = useAppStore((s) => s.selection);
  if (!selection) return <ProjectInspector />;
  return <div>Selection Inspector</div>;
}

function ProjectInspector() {
  const project = useAppStore((s) => s.project);
  const newFile = useAppStore((s) => s.newFile);
  const openFile = useAppStore((s) => s.openFile);

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
  const project = useProjectStore((s) => s);
  const setName = useAppStore((s) => s.project?.actions.setName)!;
  const setPageDimensions = useAppStore(
    (s) => s.project?.actions.setPageDimensions,
  )!;
  return (
    <div>
      <label>
        Name
        <input
          type="text"
          value={project.name}
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
            value={project.pageWidth}
            onChange={(e) =>
              setPageDimensions(e.target.valueAsNumber, project.pageHeight)
            }
          />
        </label>

        <label className="flex gap-2 items-center">
          <span>H:</span>
          <input
            className="w-full"
            type="number"
            value={project.pageHeight}
            onChange={(e) =>
              setPageDimensions(project.pageWidth, e.target.valueAsNumber)
            }
          />
        </label>
      </div>
    </div>
  );
}
