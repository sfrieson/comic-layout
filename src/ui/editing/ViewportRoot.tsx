import { Fragment, useEffect, useState } from "react";
import { Cell, Page } from "../../project/Project.js";
import { aabbFromPoints } from "../../utils/viewportUtils.js";

export interface PageData {
  type: "page";
  node: Page;
  transform: DOMMatrix;
  active: boolean;
  width: number;
  height: number;
}

export interface CellData {
  type: "cell";
  node: Cell;
  transform: DOMMatrix;
  path: Path2D;
  selected: boolean;
}

export type Data = PageData | CellData;

export function RootSVG({
  data,
  onWheel,
  onMouseDown,
  width,
  height,
}: {
  onWheel: (e: WheelEvent) => void;
  onMouseDown: (e: MouseEvent) => void;
  data: Data[];
  width: number;
  height: number;
}) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svg) return;
    svg.addEventListener("wheel", onWheel);
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svg, onWheel]);

  return (
    <svg
      ref={setSvg}
      className="w-full h-full absolute top-0 left-0"
      onMouseDown={(e) => onMouseDown(e.nativeEvent)}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        overflow: "hidden",
      }}
    >
      {data.map((d) => {
        switch (d.type) {
          case "page":
            return <PageComponent key={d.node.id} {...d} />;
          case "cell":
            return <CellComponent key={d.node.id} {...d} />;
        }
      })}
    </svg>
  );
}

function PageComponent({ node, transform, active }: PageData) {
  // apply the transform to the page
  const x = transform.e;
  const y = transform.f;
  const width = node.width * transform.a;
  const height = node.height * transform.d;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="transparent"
      stroke={active ? "cyan" : "black"}
      strokeWidth={active ? 2 : 1}
      style={{
        zIndex: active ? 1 : 0,
      }}
    />
  );
}

function CellComponent({ node, transform, selected }: CellData) {
  const points = node.path.points.map((p) => applyTransform(transform, p));
  const bb = aabbFromPoints(points);
  return (
    <Fragment>
      <path
        d={pathToSVG(points, node.path.closed)}
        fill="none"
        stroke={selected ? "cyan" : "transparent"}
        strokeWidth={selected ? 2 : 0}
      />
      <BoundingBox {...bb} />
    </Fragment>
  );
}

function BoundingBox({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const handles = [
    [0, 0] as const,
    [0, 0.5] as const,
    [0, 1] as const,
    [0.5, 0] as const,
    [0.5, 1] as const,
    [1, 0] as const,
    [1, 0.5] as const,
    [1, 1] as const,
  ].map(([mX, mY]) => {
    const size = 15;
    return (
      <rect
        key={`${mX},${mY}`}
        x={x + mX * width - size / 2}
        y={y + mY * height - size / 2}
        width={size}
        height={size}
        fill="green"
        stroke="black"
        strokeWidth={1}
      />
    );
  });
  return (
    <Fragment>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="green"
        strokeWidth={4}
      />
      {handles}
    </Fragment>
  );
}

function applyTransform(transform: DOMMatrix, point: { x: number; y: number }) {
  const x = point.x * transform.a + transform.e;
  const y = point.y * transform.d + transform.f;
  return { x, y };
}

function pathToSVG(points: { x: number; y: number }[], closed: boolean) {
  return `M ${points.map((p) => `${p.x},${p.y}`).join("L")} ${closed ? "Z" : ""}`;
}
