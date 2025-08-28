export class WithCleanup {
  #cleanupFns: (() => void)[] = [];

  addCleanup(fn: () => void) {
    this.#cleanupFns.push(fn);
  }

  cleanup() {
    for (const fn of this.#cleanupFns) {
      fn();
    }
  }
}
