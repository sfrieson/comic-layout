import { PropertySetter } from "../utils/types.js";

export interface DLLNode<T> {
  data: T;
  next: DLLNode<T>;
  prev: DLLNode<T>;
}

/**
 *  This is a doubly-linked list where all of its interfaces are created from the
 *  point of view of the UI, rendering top-down, but also returns a list for the
 *  renderer which renders buttom-up.
 */

export class RenderQueue<T extends object> {
  name = "RenderQueue";
  length: number = 0;
  #end = {
    data: null as unknown as T,
    next: null as unknown as DLLNode<T>,
    prev: null as unknown as DLLNode<T>,
  };

  constructor(name: string, data: T[]) {
    this.name = name;
    // this.#head = this.#end;
    // this.#tail = this.#end;
    this.length = 0;
    this.#end.next = this.#end;
    this.#end.prev = this.#end;
    data.forEach((item) => this.push(item));
  }

  push(data: T) {
    const node: DLLNode<T> = {
      data,
      next: this.#end,
      prev: this.#end.prev,
    };
    if (this.#end.next === this.#end) {
      this.#end.next = node;
    }
    this.#end.prev.next = node;
    this.#end.prev = node;
    this.length++;
    return node;
  }

  removeItem(item: T) {
    let node = this.#end.next;
    while (node !== this.#end) {
      if (node.data === item) {
        this.#removeNode(node);
        return node;
      }
    }
    throw new Error(`${this.name} item not found`);
  }

  removeItemAt(index: number) {
    const node = this.#nodeAt(index);
    node.prev.next = node.next;
    node.next.prev = node.prev;
    this.length--;
    return node;
  }

  insertAt(index: number, item: T) {
    const next = this.#nodeAt(index);
    const newNode: DLLNode<T> = {
      data: item,
      next: next,
      prev: next.prev,
    };
    next.prev.next = newNode;
    next.prev = newNode;
    this.length++;
  }

  #removeNode(node: DLLNode<T>) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    this.length--;
    return node;
  }

  #nodeAt(index: number) {
    let node = this.#end;
    do {
      node = node.next;
      if (node === this.#end) {
        throw new Error(`${this.name} node ${index} not found`);
      }
    } while (--index > -1);
    return node;
  }

  at(index: number) {
    return this.#nodeAt(index).data;
  }

  updateItem<LocalT extends T>(
    index: number,
    nextItem: PropertySetter<LocalT, T>,
  ) {
    const node = this.#nodeAt(index);
    if (typeof nextItem === "function") {
      node.data = nextItem(node.data);
    } else {
      node.data = nextItem;
    }
  }

  toArray(): T[] {
    const array: T[] = [];
    let current = this.#end.next;
    while (current !== this.#end) {
      array.push(current.data);
      current = current.next;
    }
    return array;
  }

  *renderOrder(): IterableIterator<T> {
    let current = this.#end.prev;
    while (current !== this.#end) {
      yield current.data;
      current = current.prev;
    }
  }

  reverseMap<RT>(callback: (item: T, i: number) => RT): RT[] {
    const array: RT[] = [];
    let current = this.#end.prev;
    let counter = this.length - 1;
    while (current !== this.#end) {
      array.push(callback(current.data, counter--));
      current = current.prev;
    }
    return array;
  }

  indexOf(item: T) {
    let current = this.#end.next;
    let counter = 0;
    while (current !== this.#end) {
      if (current.data === item) {
        return counter;
      }
      current = current.next;
      counter++;
    }
    return -1;
  }
  forEach(callback: (item: T, index: number) => void) {
    let current = this.#end.next;
    let counter = 0;
    while (current !== this.#end) {
      callback(current.data, counter++);
      current = current.next;
    }
  }
}
