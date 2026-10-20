/**
 * A controlled in-memory IndexedDB double for the paper-archive tests.
 *
 * It implements exactly the surface `src/services/paperArchive.js` uses:
 *
 *   indexedDB.open(name, version)
 *     request.onupgradeneeded / onsuccess / onerror / onblocked
 *   db.createObjectStore(name, { keyPath, autoIncrement })
 *   db.objectStoreNames.contains(name)
 *   db.transaction([names], mode)
 *   db.close()
 *   tx.objectStore(name) · tx.oncomplete · tx.onerror · tx.onabort · tx.error
 *   store.add(record) · store.get(key) · store.getAll() · store.put(record)
 *   store.createIndex(name, keyPath, { unique }) · store.index(name).get(v) / .getAll()
 *   request.onsuccess / onerror / result / error
 *
 * It is a TEST DOUBLE, not a browser implementation: there is no version
 * history, transactions are serialised, and the failure modes are injected
 * deliberately. Real-browser transaction behaviour is verified manually; this
 * double covers the archive module's own logic.
 */

class InMemoryRequest {
  constructor() {
    this.onsuccess = null;
    this.onerror = null;
    this.onblocked = null;
    this.onupgradeneeded = null;
    this.result = undefined;
    this.error = null;
  }
}

class InMemoryEvent {
  constructor(target) {
    this.target = target;
    this.defaultPrevented = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

/** The shared, durable state of one object store. */
class InMemoryStoreState {
  constructor(name, keyPath, autoIncrement) {
    this.name = name;
    this.keyPath = keyPath;
    this.autoIncrement = Boolean(autoIncrement);
    this.records = new Map();
    this.indexes = new Map();
    this.counter = 1;
  }
}

class InMemoryIndex {
  constructor(state, name, keyPath, unique) {
    this._state = state;
    this.name = name;
    this.keyPath = keyPath;
    this.unique = unique;
  }

  _find(value) {
    for (const record of this._state.records.values()) {
      if (record[this.keyPath] === value) return record;
    }
    return undefined;
  }

  _findAll() {
    const out = [];
    for (const record of this._state.records.values()) {
      if (record[this.keyPath] === undefined || record[this.keyPath] === null) continue;
      out.push(record);
    }
    return out;
  }
}

class InMemoryObjectStore {
  constructor(state, transaction) {
    this._state = state;
    this._transaction = transaction;
    this.name = state.name;
    this.keyPath = state.keyPath;
    this.autoIncrement = state.autoIncrement;
  }

  createIndex(name, keyPath, opts = {}) {
    const index = new InMemoryIndex(this._state, name, keyPath, Boolean(opts.unique));
    this._state.indexes.set(name, index);
    return index;
  }

  index(name) {
    const definition = this._state.indexes.get(name);
    if (!definition) throw new Error(`No index named ${name}`);
    const transaction = this._transaction;
    return {
      name: definition.name,
      keyPath: definition.keyPath,
      unique: definition.unique,
      get: (value) => {
        const req = new InMemoryRequest();
        transaction._enqueue(() => {
          const record = definition._find(value);
          req.result = record ? { ...record } : undefined;
          return { request: req, error: null };
        });
        return req;
      },
      getAll: () => {
        const req = new InMemoryRequest();
        transaction._enqueue(() => {
          req.result = definition._findAll().map((r) => ({ ...r }));
          return { request: req, error: null };
        });
        return req;
      },
    };
  }

  _violatesUniqueIndex(record) {
    for (const index of this._state.indexes.values()) {
      if (!index.unique) continue;
      const value = record[index.keyPath];
      if (value === undefined || value === null) continue;
      for (const existing of this._state.records.values()) {
        if (existing[index.keyPath] === value) return true;
      }
    }
    return false;
  }

  _enqueue(work) {
    this._transaction._enqueue(work);
  }

  add(record) {
    const request = new InMemoryRequest();
    this._enqueue(() => {
      const state = this._state;
      const stored = { ...record };
      if (state.autoIncrement && stored[state.keyPath] === undefined) {
        stored[state.keyPath] = state.counter++;
      }
      const key = stored[state.keyPath];

      const failure = this._transaction._injectedFailure;
      if (failure) {
        this._transaction._injectedFailure = null;
        const error = new Error(failure.message || 'Injected write failure.');
        error.name = failure.name || 'AbortError';
        request.error = error;
        return { request, error };
      }
      if (state.records.has(key)) {
        const error = new Error('Key already exists in the object store.');
        error.name = 'ConstraintError';
        request.error = error;
        return { request, error };
      }
      if (this._violatesUniqueIndex(stored)) {
        const error = new Error('A record with this key already exists in the index.');
        error.name = 'ConstraintError';
        request.error = error;
        return { request, error };
      }
      state.records.set(key, stored);
      request.result = key;
      return { request, error: null };
    });
    return request;
  }

  put(record) {
    const request = new InMemoryRequest();
    this._enqueue(() => {
      const state = this._state;
      const stored = { ...record };
      if (state.autoIncrement && stored[state.keyPath] === undefined) {
        stored[state.keyPath] = state.counter++;
      }
      const key = stored[state.keyPath];
      const failure = this._transaction._injectedFailure;
      if (failure) {
        this._transaction._injectedFailure = null;
        const error = new Error(failure.message || 'Injected write failure.');
        error.name = failure.name || 'AbortError';
        request.error = error;
        return { request, error };
      }
      state.records.set(key, stored);
      request.result = key;
      return { request, error: null };
    });
    return request;
  }

  get(key) {
    const request = new InMemoryRequest();
    this._enqueue(() => {
      const record = this._state.records.get(key);
      request.result = record ? { ...record } : undefined;
      return { request, error: null };
    });
    return request;
  }

  getAll() {
    const request = new InMemoryRequest();
    this._enqueue(() => {
      request.result = [...this._state.records.values()].map((r) => ({ ...r }));
      return { request, error: null };
    });
    return request;
  }
}

class InMemoryTransaction {
  constructor(db, mode) {
    this.db = db;
    this.mode = mode;
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this.error = null;
    this._queue = [];
    this._aborted = false;
    this._injectedFailure = null;
  }

  objectStore(name) {
    const state = this.db._stateFor(name);
    return new InMemoryObjectStore(state, this);
  }

  _enqueue(work) {
    this._queue.push(work);
    // An injected failure applies to the NEXT write request in this transaction.
    const control = this.db._control;
    if (control && control.failNextWrite && !this._injectedFailure) {
      this._injectedFailure = { name: control.failNextWrite, message: 'Injected write failure.' };
    }
  }

  /** Processing starts in a later task, like a real transaction. */
  _run() {
    setTimeout(() => this._pump(), 0);
  }

  _pump() {
    if (this._aborted) return;
    const work = this._queue.shift();
    if (!work) {
      if (this.oncomplete) this.oncomplete(new InMemoryEvent(this));
      return;
    }

    let settled;
    try {
      settled = work();
    } catch (err) {
      this.error = err;
      this._aborted = true;
      if (this.onerror) this.onerror(new InMemoryEvent(this));
      if (this.onabort) this.onabort(new InMemoryEvent(this));
      return;
    }

    const { request, error } = settled;
    if (error) {
      const event = new InMemoryEvent(request);
      if (request.onerror) request.onerror(event);
      if (!event.defaultPrevented) {
        this.error = error;
        this._aborted = true;
        if (this.onerror) this.onerror(new InMemoryEvent(this));
        if (this.onabort) this.onabort(new InMemoryEvent(this));
        return;
      }
      // The error was handled: the transaction continues.
      setTimeout(() => this._pump(), 0);
      return;
    }

    if (request.onsuccess) request.onsuccess(new InMemoryEvent(request));
    setTimeout(() => this._pump(), 0);
  }
}

class InMemoryDatabase {
  constructor(name, version, control) {
    this.name = name;
    this.version = version;
    this._control = control || null;
    this._stores = new Map();
    this.objectStoreNames = {
      contains: (storeName) => this._stores.has(storeName),
    };
    this.onversionchange = null;
  }

  _stateFor(name) {
    if (!this._stores.has(name)) {
      this._stores.set(name, new InMemoryStoreState(name, undefined, false));
    }
    return this._stores.get(name);
  }

  createObjectStore(name, opts = {}) {
    const state = new InMemoryStoreState(name, opts.keyPath, opts.autoIncrement);
    this._stores.set(name, state);
    return new InMemoryObjectStore(state, new InMemoryTransaction(this, 'versionchange'));
  }

  transaction(names, mode = 'readonly') {
    const tx = new InMemoryTransaction(this, mode);
    tx._run();
    return tx;
  }

  close() {
    /* nothing to release in the double */
  }
}

/**
 * Create an in-memory IndexedDB double.
 * @param {object} [options]
 * @param {string} [options.failNextWrite] error name injected on the next write
 * @param {string} [options.failOpen] error name injected when opening
 * @param {boolean} [options.blockOpen] simulate a blocked open
 */
export function createInMemoryIndexedDB(options = {}) {
  const control = {
    failNextWrite: options.failNextWrite || null,
    failOpen: options.failOpen || null,
    blockOpen: Boolean(options.blockOpen),
  };

  const indexedDB = {
    open(name, version) {
      const request = new InMemoryRequest();
      setTimeout(() => {
        if (control.blockOpen) {
          if (request.onblocked) request.onblocked(new InMemoryEvent(request));
          return;
        }
        if (control.failOpen) {
          const error = new Error('Injected open failure.');
          error.name = control.failOpen;
          request.error = error;
          if (request.onerror) request.onerror(new InMemoryEvent(request));
          return;
        }
        const database = new InMemoryDatabase(name, version, control);
        control.lastDatabase = database;
        request.result = database;
        if (request.onupgradeneeded) {
          const event = new InMemoryEvent(request);
          event.target = {
            result: database,
            transaction: new InMemoryTransaction(database, 'versionchange'),
          };
          request.onupgradeneeded(event);
        }
        if (request.onsuccess) request.onsuccess(new InMemoryEvent(request));
      }, 0);
      return request;
    },
  };

  return { indexedDB, control };
}
