/**
 * Minimal browser API stubs for the Node test environment.
 * No DOM library is required: the code under test only touches
 * localStorage and fetch.
 */

const createStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
};

if (!globalThis.localStorage) {
  globalThis.localStorage = createStorage();
}

if (!globalThis.window) {
  globalThis.window = globalThis;
}
