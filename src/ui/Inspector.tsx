import { useStore } from "zustand";
import { store } from "../app/App.js";
import {
  addCellToPage,
  addNodeFill,
  addPage,
  removeCell,
  removeNodeFillAtIndex,
  removePage,
  setName,
  setNodeFillAtIndex,
  setNodeOpacityAtIndex,
  setPageDimensions,
} from "../app/projectActions.js";
import { useRecentFiles } from "../app/hooks.js";
import { assert, expect } from "../utils/assert.js";
import { Cell, Fill } from "../project/Project.js";
import { useHotkeys } from "react-hotkeys-hook";
import { useProject } from "./ProjectContext.js";

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
  useHotkeys("backspace", () => removeCell(node));
  return (
    <div>
      <p>Cell Inspector</p>
      <NodeFillsEditor nodeId={node.id} />
    </div>
  );
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
  const project = useProject((p) => p);
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
      <NodeFillsEditor nodeId={page.id} />

      <button onClick={() => addCellToPage(page.id)}>Add cell</button>
    </div>
  );
}

function NodeFillsEditor({ nodeId }: { nodeId: string }) {
  const fills = useStore(store, (s) => s.project?.nodeMap.get(nodeId)?.fills);
  assert(fills, "Node has no fills");

  return (
    <div>
      <div className="flex gap-2 justify-between">
        <p>Fills</p>
        <button onClick={() => addNodeFill(nodeId)}>Add Fill</button>
      </div>
      <div>
        {fills.map((fill, i) => (
          <FillEditor
            key={`fill-${i}-${fill.type}`}
            {...fill}
            nodeId={nodeId}
            i={i}
          />
        ))}
      </div>
    </div>
  );
}

function FillEditor({
  type,
  value,
  opacity,
  nodeId,
  i,
}: Fill & { i: number; nodeId: string }) {
  if (type === "color") {
    return (
      <CommonFillEditor nodeId={nodeId} i={i} opacity={opacity}>
        <ColorFillEditor value={value} nodeId={nodeId} i={i} />
      </CommonFillEditor>
    );
  }
  return null;
}

function CommonFillEditor({
  children,
  nodeId,
  opacity,
  i,
}: {
  children: React.ReactNode;
  nodeId: string;
  opacity: number;
  i: number;
}) {
  return (
    <div className="flex gap-2 h-8">
      {children}
      <div className="h-full">
        <input
          type="number"
          className="h-full p-0"
          style={{ width: "5ch" }}
          name="opacity"
          value={opacity * 100}
          onChange={(e) => {
            setNodeOpacityAtIndex(nodeId, i, e.target.valueAsNumber / 100);
          }}
        />
      </div>
      <button onClick={() => removeNodeFillAtIndex(nodeId, i)}>–</button>
    </div>
  );
}

function ColorFillEditor({
  value,
  nodeId,
  i,
}: {
  value: string;
  nodeId: string;
  i: number;
}) {
  return (
    <div className="flex gap-2 h-8">
      <div className="h-full aspect-square">
        <input
          type="color"
          className="h-full w-full p-0"
          name="color"
          value={value}
          onChange={(e) => {
            setNodeFillAtIndex(nodeId, "color", i, (fill) => ({
              ...fill,
              value: e.target.value,
            }));
          }}
        />
      </div>
      <div className="flex gap-2 h-full">
        <div className="h-full w-full">
          <input
            type="text"
            className="h-full w-full p-0"
            name="color"
            defaultValue={value}
            onBlur={(e) => {
              setNodeFillAtIndex(nodeId, "color", i, (fill) => ({
                ...fill,
                value: e.target.value,
              }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
