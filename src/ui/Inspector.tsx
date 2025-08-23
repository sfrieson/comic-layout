import { useStore } from "zustand";
import { store, useProject } from "../app/App.js";
import {
  addCellToPage,
  addPage,
  removePage,
  setName,
  setPageDimensions,
  setPageFillColor,
} from "../app/projectActions.js";
import { useRecentFiles } from "../app/hooks.js";
import { assert, expect } from "../utils/assert.js";
import { Cell } from "../project/Project.js";

export function Inspector() {
  const selection = useStore(store, (s) => s.ui.selection);
  if (!selection.size) return <ProjectInspector />;
  if (selection.size > 1) {
    return <div>Multi-Selection Inspector</div>;
  }

  const node = selection.values().next().value!;
  if (node.type === "cell") {
    return <CellInspector node={node} />;
  }
  return <div>Selection Inspector</div>;
}

function CellInspector({ node }: { node: Cell }) {
  return <div>Cell Inspector</div>;
}

function ProjectInspector() {
  const project = useStore(store, (s) => s.project);
  const ui = useStore(store, (s) => s.ui);

  if (!project) return <IdleInspector />;

  if (!ui.activePage) return <LoadedProjectInspector />;

  return <PageInspector />;
}

function IdleInspector() {
  const { recentFiles, addRecentFile } = useRecentFiles();
  const newFile = useStore(store, (s) => s.newFile);
  const openFile = useStore(store, (s) => s.openFile);

  return (
    <div>
      <button
        onClick={async () => {
          const handle = await newFile();
          addRecentFile(handle);
        }}
      >
        New Project
      </button>
      <button
        onClick={async () => {
          const handle = await openFile();
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
          name="projectName"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <p>Page dimensions</p>
      <div className="flex gap-2">
        <label className="flex gap-2 items-center">
          <span>W:</span>
          <input
            name="pageWidth"
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
            name="pageHeight"
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

function PageInspector() {
  const page = useStore(store, (s) => {
    const activePage = expect(s.ui.activePage, "No active page");
    const node = expect(s.project?.nodeMap.get(activePage), "No page node");
    assert(node.type === "page", "Node is not a page");
    return node;
  });

  return (
    <div>
      <p>Page Inspector</p>
      <button onClick={() => removePage(page.id)}>Remove Page</button>
      <div>
        <label>
          Background Fill
          <div>
            {page.fills.map((fill, i) => (
              <div key={`fill-${i}-${fill.type}`}>
                {fill.type}
                <input
                  type="color"
                  className="w-full h-16"
                  name="backgroundColor"
                  value={fill.value}
                  onChange={(e) => {
                    setPageFillColor(page.id, i, e.target.value);
                  }}
                />
              </div>
            ))}
          </div>
        </label>
      </div>

      <button onClick={() => addCellToPage(page.id)}>Add cell</button>
    </div>
  );
}
