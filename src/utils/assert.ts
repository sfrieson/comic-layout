export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function expect<T>(value: T | null | undefined, message: string) {
  assert(value != null, message);
  return value;
}
