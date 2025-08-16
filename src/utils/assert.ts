export function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function expect<T>(value: T | null | undefined, message: string) {
  assert(value, message);
  return value;
}
