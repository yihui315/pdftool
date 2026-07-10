const HTML_ESCAPE_PATTERN = /[&<>"]/g;
const HTML_REPLACEMENTS = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
});

const JSON_ESCAPE_PATTERN = /[<>&\u2028\u2029]/g;
const JSON_REPLACEMENTS = Object.freeze({
  "<": "\\u003C",
  ">": "\\u003E",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
});

/** Escape plain text for an HTML text node. */
export function escapeHtml(value) {
  return String(value).replace(
    HTML_ESCAPE_PATTERN,
    (character) => HTML_REPLACEMENTS[character]
  );
}

/** Escape a string for a quoted HTML attribute value. */
export function escapeAttribute(value) {
  return escapeHtml(value);
}

/**
 * Serialize JSON for an inline JSON-LD script without allowing the payload to
 * terminate the script element or introduce JavaScript line separators.
 */
export function safeJson(value) {
  const json = JSON.stringify(value);
  if (json === undefined) {
    throw new Error("Unable to serialize JSON value");
  }
  return json.replace(
    JSON_ESCAPE_PATTERN,
    (character) => JSON_REPLACEMENTS[character]
  );
}
