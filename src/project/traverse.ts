import { Node } from "./Project.js";
import { SerializedNode } from "./types.js";

type VisitorConfig = {
  [Type in Node["type"]]?: (node: Extract<Node, { type: Type }>) => void;
} & {
  [Type in Node["type"] as `${Type}AfterChildren`]?: (
    node: Extract<Node, { type: Type }>,
  ) => void;
} & {
  rest?: (node: Node) => void;
  restAfterChildren?: (node: Node) => void;
  all?: (node: Node) => void;
  allAfterChildren?: (node: Node) => void;
};

type VisitorFn = (node: Node) => void;

type Visitor = VisitorConfig | VisitorFn;

export function traverse(node: Node | Node[], visitor: Visitor) {
  if (Array.isArray(node)) {
    node.forEach((n) => traverse(n, visitor));
    return;
  }

  if (typeof visitor === "function") {
    visitor(node);
  } else {
    const nodeVisitor = visitor[node.type];
    if (nodeVisitor) {
      (nodeVisitor as (node: Node) => void)(node);
    } else {
      visitor.rest?.(node);
    }
    visitor.all?.(node);
  }

  switch (node.type) {
    case "page":
    case "cell":
      traverse(node.children.toArray(), visitor);
      break;
    // Below don't actually have children but are included for completeness
    case "rectangle":
    case "text_path-aligned":
      traverse(node.children.toArray(), visitor);
      break;
    case "duplicated":
      traverse(node.children.toArray(), visitor);
      // TODO It's questionable whether the referenced node should be traversed. Add config?
      console.warn("Duplicated node's referenced node is not traversed");
      break;
    default: {
      const _unreachable: never = node;
      throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
    }
  }
  if (typeof visitor === "object") {
    if (visitor[`${node.type}AfterChildren`]) {
      (visitor[`${node.type}AfterChildren`] as (node: Node) => void)(node);
    } else {
      visitor.restAfterChildren?.(node);
    }
    visitor.allAfterChildren?.(node);
  }
}

export function traverseSerializedNode(
  nodes: SerializedNode[],
  currentNodeId: string | string[],
  visitor: (node: SerializedNode) => void,
) {
  const map = new Map<string, SerializedNode>(nodes.map((n) => [n.id, n]));
  const walk = (node: SerializedNode) => {
    visitor(node);
    node.children.forEach((id) => {
      const child = map.get(id);
      if (child) {
        walk(child);
      }
    });
  };
  if (Array.isArray(currentNodeId)) {
    currentNodeId.forEach((id) => walk(map.get(id)!));
    return;
  } else {
    walk(map.get(currentNodeId)!);
  }
}
