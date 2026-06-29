import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { PDFDocument, degrees } from "pdf-lib";
import { vi } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

function adaptDocument(document) {
  const copyPages = document.copyPages.bind(document);
  document.copyPages = (sourceDocument, indices) => copyPages(sourceDocument, Array.from(indices));

  const setKeywords = document.setKeywords.bind(document);
  document.setKeywords = (keywords) => setKeywords(Array.from(keywords));
  return document;
}

export function loadPage(pageName, scriptName) {
  const html = readFileSync(resolve(projectRoot, pageName), "utf8");
  const script = readFileSync(resolve(projectRoot, "assets/js", scriptName), "utf8");
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: `https://pdftool.work/${pageName}`
  });

  dom.window.PDFLib = {
    PDFDocument: {
      create: async (...args) => adaptDocument(await PDFDocument.create(...args)),
      load: async (input, options) => adaptDocument(await PDFDocument.load(new Uint8Array(input), options))
    },
    degrees
  };
  dom.window.URL.createObjectURL = vi.fn(() => "blob:pdftool-result");
  dom.window.URL.revokeObjectURL = vi.fn();
  dom.window.eval(script);

  return dom;
}

export async function createPdf(pageCount = 1) {
  const document = await PDFDocument.create();
  for (let page = 0; page < pageCount; page += 1) {
    document.addPage([595, 842]);
  }
  return document.save();
}

export function setInputFiles(dom, selector, files) {
  const input = dom.window.document.querySelector(selector);
  Object.defineProperty(input, "files", {
    configurable: true,
    value: files
  });
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  return input;
}

export async function waitFor(check, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      if (check()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }

  if (lastError) throw lastError;
  throw new Error("Timed out waiting for the expected browser state.");
}
