class Comparator {
  canHandle(_value) {
    throw new Error("canHandle() needs to be overridden");
  }

  compare(_a, _b, _context) {
    throw new Error("compare() needs to be overridden");
  }
}

class NumberComparator extends Comparator {
  canHandle(value) {
    return typeof value === "number";
  }

  compare(a, b) {
    return typeof b === "number" && Object.is(a, b);
  }
}

class StringComparator extends Comparator {
  canHandle(value) {
    return typeof value === "string";
  }

  compare(a, b, context) {
    if (typeof b !== "string") return false;
    if (context.options.caseSensitive === false) {
      return a.toLocaleLowerCase() === b.toLocaleLowerCase();
    }
    return Object.is(a, b);
  }
}

class BooleanComparator extends Comparator {
  canHandle(value) {
    return typeof value === "boolean";
  }

  compare(a, b) {
    return typeof b === "boolean" && Object.is(a, b);
  }
}

class PrimitiveComparator extends Comparator {
  canHandle(value) {
    return value == null || typeof value !== "object";
  }

  compare(a, b) {
    return Object.is(a, b);
  }
}

class DateComparator extends Comparator {
  canHandle(value) {
    return value instanceof Date;
  }

  compare(a, b) {
    return b instanceof Date && Object.is(a.getTime(), b.getTime());
  }
}

class RegExpComparator extends Comparator {
  canHandle(value) {
    return value instanceof RegExp;
  }

  compare(a, b) {
    return b instanceof RegExp && a.source === b.source && a.flags === b.flags;
  }
}

class MapComparator extends Comparator {
  canHandle(value) {
    return value instanceof Map;
  }

  compare(a, b, context) {
    if (!(b instanceof Map) || a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key)) return false;
      if (!context.compareNested(value, b.get(key))) return false;
    }
    return true;
  }
}

class SetComparator extends Comparator {
  canHandle(value) {
    return value instanceof Set;
  }

  compare(a, b, context) {
    if (!(b instanceof Set) || a.size !== b.size) return false;
    const used = new Set();
    for (const item of a) {
      let found = false;
      for (const candidate of b) {
        if (!used.has(candidate) && context.compareNested(item, candidate)) {
          used.add(candidate);
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }
}

class ArrayComparator extends Comparator {
  canHandle(value) {
    return Array.isArray(value);
  }

  compare(a, b, context) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => context.compareNested(item, b[index]));
  }
}

class UnorderedArrayComparator extends ArrayComparator {
  compare(a, b, context) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    const used = new Set();
    return a.every((item) => {
      const index = b.findIndex(
        (candidate, candidateIndex) =>
          !used.has(candidateIndex) && context.compareNested(item, candidate)
      );
      if (index === -1) return false;
      used.add(index);
      return true;
    });
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

class ObjectComparator extends Comparator {
  canHandle(value) {
    return isPlainObject(value);
  }

  compare(a, b, context) {
    if (!isPlainObject(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (key) => Object.hasOwn(b, key) && context.compareNested(a[key], b[key])
    );
  }
}

class DeepEqualEngine {
  constructor(options = {}) {
    this.options = {
      ignoreArrayOrder: false,
      caseSensitive: true,
      ...options,
    };
    this.comparators = [
      new NumberComparator(),
      new StringComparator(),
      new BooleanComparator(),
      new PrimitiveComparator(),
      new DateComparator(),
      new RegExpComparator(),
      new MapComparator(),
      new SetComparator(),
      this.options.ignoreArrayOrder
        ? new UnorderedArrayComparator()
        : new ArrayComparator(),
      new ObjectComparator(),
    ];
    this.#seen = new WeakMap();
  }

  #seen;

  deepEqual(a, b) {
    this.#seen = new WeakMap();
    return this.#compare(a, b);
  }

  compareNested(a, b) {
    return this.#compare(a, b);
  }

  findComparator(value) {
    return this.comparators.find((comparator) => comparator.canHandle(value));
  }

  addComparator(comparator) {
    if (!(comparator instanceof Comparator)) {
      throw new TypeError("The comparator must inherit from Comparator");
    }
    this.comparators.unshift(comparator);
  }

  #compare(a, b) {
    const bothObjects = isObject(a) && isObject(b);
    if (bothObjects) {
      let paired = this.#seen.get(a);
      if (paired?.has(b)) return true;
      if (!paired) {
        paired = new WeakSet();
        this.#seen.set(a, paired);
      }
      paired.add(b);
    }

    try {
      const comparator = this.findComparator(a);
      if (!comparator) {
        throw new Error(`No comparator for ${describe(a)}`);
      }
      return comparator.compare(a, b, this);
    } finally {
      if (bothObjects) this.#seen.get(a)?.delete(b);
    }
  }
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

function describe(value) {
  if (value === null) return "null";
  return value.constructor?.name ?? typeof value;
}

module.exports = {
  Comparator,
  NumberComparator,
  StringComparator,
  BooleanComparator,
  PrimitiveComparator,
  DateComparator,
  RegExpComparator,
  MapComparator,
  SetComparator,
  ArrayComparator,
  UnorderedArrayComparator,
  ObjectComparator,
  DeepEqualEngine,
  isPlainObject,
};
