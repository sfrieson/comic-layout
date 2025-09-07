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
    if (visitor[node.type]) {
      visitor[node.type]?.(node);
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
    default: {
      const _unreachable: never = node;
      throw new Error(`Unknown node type: ${(_unreachable as Node).type}`);
    }
  }
  if (typeof visitor === "object") {
    if (visitor[`${node.type}AfterChildren`]) {
      visitor[`${node.type}AfterChildren`]?.(node);
    } else {
      visitor.restAfterChildren?.(node);
    }
    visitor.allAfterChildren?.(node);
  }
}

function traverseSerializedNode(
  nodes: SerializedNode | SerializedNode[],
  visitor: (node: SerializedNode) => void,
) {
  if (Array.isArray(nodes)) {
    nodes.forEach((n) => traverseSerializedNode(n, visitor));
    return;
  }

  visitor(nodes);
}
