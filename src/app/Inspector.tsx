import { useAppStore, useProjectStore } from "./App.js";

export function Inspector() {
  const selection = useAppStore((s) => s.selection);
  if (!selection) return <ProjectInspector />;
  return <div>Selection Inspector</div>;
}

function ProjectInspector() {
  const project = useAppStore((s) => s.project);
  const createProject = useAppStore((s) => s.createProject);
  const openFile = useAppStore((s) => s.openFile);

  if (!project)
    return (
      <div>
        <button onClick={() => createProject()}>New Project</button>
        <button onClick={() => openFile()}>Open Project</button>
      </div>
    );

  return <LoadedProjectInspector />;
}

function LoadedProjectInspector() {
  const name = useProjectStore((s) => s.name);
  const setName = useAppStore((s) => s.project?.actions.setName)!;
  return (
    <div>
      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
    </div>
  );
}
