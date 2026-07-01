if (typeof Promise.try !== "function") {
  Object.defineProperty(Promise, "try", {
    configurable: true,
    writable: true,
    value(callback, ...args) {
      return new Promise((resolve) => resolve(callback(...args)));
    }
  });
}

if (typeof Uint8Array.prototype.toHex !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    configurable: true,
    writable: true,
    value() {
      let hex = "";
      for (const byte of this) hex += byte.toString(16).padStart(2, "0");
      return hex;
    }
  });
}

if (typeof Uint8Array.prototype.toBase64 !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toBase64", {
    configurable: true,
    writable: true,
    value() {
      const chunks = [];
      for (let offset = 0; offset < this.length; offset += 0x8000) {
        chunks.push(String.fromCharCode(...this.subarray(offset, offset + 0x8000)));
      }
      return btoa(chunks.join(""));
    }
  });
}

if (typeof Uint8Array.fromBase64 !== "function") {
  Object.defineProperty(Uint8Array, "fromBase64", {
    configurable: true,
    writable: true,
    value(value) {
      const binary = atob(value);
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }
  });
}

if (typeof Map.prototype.getOrInsertComputed !== "function") {
  Object.defineProperty(Map.prototype, "getOrInsertComputed", {
    configurable: true,
    writable: true,
    value(key, callback) {
      if (this.has(key)) return this.get(key);
      const value = callback(key);
      this.set(key, value);
      return value;
    }
  });
}

if (typeof Set.prototype.union !== "function") {
  Object.defineProperty(Set.prototype, "union", {
    configurable: true,
    writable: true,
    value(other) {
      const result = new Set(this);
      for (const value of other) result.add(value);
      return result;
    }
  });
}

if (typeof Set.prototype.intersection !== "function") {
  Object.defineProperty(Set.prototype, "intersection", {
    configurable: true,
    writable: true,
    value(other) {
      const result = new Set();
      for (const value of this) if (other.has(value)) result.add(value);
      return result;
    }
  });
}
