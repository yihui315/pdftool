(function () {
  "use strict";

  const SCRIPT_ID = "runtime-i18n";
  const TOKEN_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

  function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false;
    if (Object.prototype.toString.call(value) !== "[object Object]") return false;

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function readRuntimeData() {
    const script = document.getElementById(SCRIPT_ID);
    if (!script) {
      throw new Error(`Missing runtime translation data: #${SCRIPT_ID}`);
    }

    try {
      return JSON.parse(script.textContent || "");
    } catch (error) {
      throw new Error(`Invalid runtime translation JSON: ${error.message}`);
    }
  }

  const data = readRuntimeData();
  if (!isPlainObject(data)) {
    throw new Error("Runtime translation data must be a plain object");
  }
  if (typeof data.locale !== "string" || data.locale.trim() === "") {
    throw new Error("Runtime translation locale is missing");
  }
  if (!isPlainObject(data.messages)) {
    throw new Error("Runtime translation messages must be a plain object");
  }

  const messages = Object.create(null);
  for (const key of Object.keys(data.messages)) {
    const message = data.messages[key];
    if (typeof message !== "string") {
      throw new Error(`Runtime translation message must be a string: ${key}`);
    }
    messages[key] = message;
  }
  Object.freeze(messages);

  const api = Object.freeze({
    locale: data.locale,
    t(key, values = {}) {
      if (!(key in messages)) {
        throw new Error(`Missing runtime translation: ${key}`);
      }

      const interpolationValues =
        values === null || values === undefined ? {} : Object(values);
      return messages[key].replace(TOKEN_PATTERN, (_match, token) => {
        if (!(token in interpolationValues)) {
          throw new Error(`Missing interpolation value: ${key}.${token}`);
        }
        return String(interpolationValues[token]);
      });
    }
  });

  Object.defineProperty(window, "PDFToolI18n", {
    value: api,
    enumerable: true,
    configurable: false,
    writable: false
  });
})();
