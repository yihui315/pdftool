import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path, { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { LOCALES, getLocale } from "../site/config/locales.mjs";
import {
  CORE_ROUTES,
  LANDING_ROUTES,
  canonicalPath,
  getRoute,
  outputPath
} from "../site/config/routes.mjs";
import { loadLocaleContent } from "../site/lib/content.mjs";
import { DEFAULT_ORIGIN, absoluteUrl } from "../site/lib/paths.mjs";
import { renderFragment } from "../site/lib/render-fragment.mjs";
import { generateSitemapXml } from "../site/lib/sitemap.mjs";
import { renderLayout } from "../site/templates/layout.mjs";
import { copyVendor } from "./copy-vendor.mjs";
import { verifyRelease } from "./verify-release.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoutes = Object.freeze([...CORE_ROUTES, ...LANDING_ROUTES]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function normalizeRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") {
    throw new Error("Output path must be a non-empty string.");
  }
  const value = relativePath.replaceAll("\\", "/");
  if (value.includes("\0") || value.startsWith("/") || path.isAbsolute(value)) {
    throw new Error(`Unsafe output path: ${relativePath}`);
  }
  const normalized = path.posix.normalize(value);
  if (normalized === "." || normalized.startsWith("../") || normalized === "..") {
    throw new Error(`Unsafe output path: ${relativePath}`);
  }
  return normalized;
}

function resolveInside(outputRoot, relativePath) {
  const safeRelative = normalizeRelativePath(relativePath);
  const target = resolve(outputRoot, safeRelative);
  const relative = path.relative(outputRoot, target);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Output path resolves outside the release root: ${relativePath}`);
  }
  return target;
}

function normalizeRoutes(routes = defaultRoutes) {
  return Object.freeze(
    routes.map((route) => {
      if (typeof route === "string") return getRoute(route);
      if (!route || typeof route.key !== "string") {
        throw new Error("Build routes must be route keys or route metadata objects.");
      }
      return getRoute(route.key);
    })
  );
}

function normalizeLocales(locales = LOCALES) {
  return Object.freeze(
    locales.map((locale) => {
      if (typeof locale === "string") return getLocale(locale);
      if (!locale || typeof locale.code !== "string") {
        throw new Error("Build locales must be locale codes or locale metadata objects.");
      }
      return getLocale(locale.code);
    })
  );
}

function routeSupportsLocale(route, locale) {
  return route.locales.includes(locale.code);
}

function stagingDirFor(outDir) {
  const outputRoot = resolve(outDir);
  const parent = dirname(outputRoot);
  const name = path.basename(outputRoot);
  return resolve(parent, name === "dist" ? "dist.next" : `${name}.next`);
}

export function assertSafeOutputRoot(outDir) {
  if (typeof outDir !== "string" || outDir.trim() === "") {
    throw new Error("Unsafe output root: output directory is required.");
  }

  const outputRoot = resolve(outDir);
  const filesystemRoot = path.parse(outputRoot).root;
  if (outputRoot === filesystemRoot) {
    throw new Error(`Unsafe output root: ${outputRoot} is a filesystem root.`);
  }

  const projectFromOutput = path.relative(outputRoot, projectRoot);
  const outputContainsProject =
    projectFromOutput === "" ||
    (!projectFromOutput.startsWith("..") && !path.isAbsolute(projectFromOutput));
  if (outputContainsProject) {
    throw new Error(
      `Unsafe output root: ${outputRoot} must not be the project root or its ancestor.`
    );
  }

  return outputRoot;
}

async function existingDirectory(filename) {
  const details = await stat(filename).catch(() => null);
  return details?.isDirectory() ? filename : null;
}

async function localeContentDirectory(contentRoot, locale) {
  const candidates = [locale.code, locale.prefix].filter(Boolean);
  for (const candidate of candidates) {
    const directory = await existingDirectory(path.join(contentRoot, candidate));
    if (directory) return directory;
  }
  return path.join(contentRoot, locale.code);
}

async function loadContentMap(contentRoot, locales) {
  const byCode = new Map();
  const needsEnglishReference = locales.some(({ code }) => code !== "en");
  const englishLocale = getLocale("en");
  let englishRuntime;

  if (locales.some(({ code }) => code === "en") || needsEnglishReference) {
    const englishDirectory = await localeContentDirectory(contentRoot, englishLocale);
    const englishContent = await loadLocaleContent(englishDirectory, {
      expectedLocale: "en"
    });
    englishRuntime = englishContent.runtime;
    if (locales.some(({ code }) => code === "en")) {
      byCode.set("en", englishContent);
    }
  }

  for (const locale of locales) {
    if (locale.code === "en") continue;
    const directory = await localeContentDirectory(contentRoot, locale);
    byCode.set(
      locale.code,
      await loadLocaleContent(directory, {
        expectedLocale: locale.code,
        englishRuntime
      })
    );
  }

  return byCode;
}

async function readTemplateFragment(route) {
  if (!route.fragment) return null;
  const filename = path.join(projectRoot, "site/templates/pages", route.fragment);
  return readFile(filename, "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
}

async function renderRouteFragment(route, page) {
  const template = await readTemplateFragment(route);
  if (template) return renderFragment(template, page.strings);

  return renderFragment(
    [
      '<section class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">',
      '<h1 class="text-4xl font-extrabold tracking-tight text-slate-950" data-i18n="buildPageH1"></h1>',
      '<p class="mt-4 text-lg text-slate-700" data-i18n="buildPageLead"></p>',
      "</section>"
    ].join(""),
    {
      ...page.strings,
      buildPageH1: page.h1,
      buildPageLead: page.lead
    }
  );
}

function alternatesFor(route, locales) {
  return Object.freeze(
    locales
      .filter((locale) => routeSupportsLocale(route, locale))
      .map((locale) =>
        Object.freeze({
          locale: locale.code,
          hrefLang: locale.hrefLang,
          path: canonicalPath(locale.code, route.key)
        })
      )
  );
}

async function writeInside(outputRoot, relativePath, data) {
  const target = resolveInside(outputRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
}

async function copyStaticAssets(stagingDir) {
  await cp(path.join(projectRoot, "assets"), path.join(stagingDir, "assets"), {
    recursive: true,
    force: true
  });
  await copyVendor({ outRoot: stagingDir });
  await writeInside(
    stagingDir,
    "ads.txt",
    await readFile(path.join(projectRoot, "ads.txt"), "utf8")
  );
}

function robotsTxt({ origin = DEFAULT_ORIGIN } = {}) {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml", origin)}`,
    ""
  ].join("\n");
}

async function renderRoutes({ stagingDir, routes, locales, contentByLocale }) {
  const renderedRoutes = [];

  for (const locale of locales) {
    const content = contentByLocale.get(locale.code);
    if (!content) throw new Error(`Missing loaded content for locale: ${locale.code}`);

    for (const route of routes) {
      if (!routeSupportsLocale(route, locale)) continue;
      const page = content.pages[route.key];
      if (!page) {
        throw new Error(`Missing page content for ${locale.code}/${route.key}`);
      }

      const relativePath = outputPath(locale.code, route.key);
      const fragment = await renderRouteFragment(route, page);
      const html = renderLayout({
        locale: locale.code,
        routeKey: route.key,
        common: content.common,
        page,
        fragment
      });
      await writeInside(stagingDir, relativePath, html);

      renderedRoutes.push(
        Object.freeze({
          locale: locale.code,
          key: route.key,
          file: normalizeRelativePath(relativePath),
          canonicalPath: canonicalPath(locale.code, route.key),
          alternates: alternatesFor(route, locales)
        })
      );
    }
  }

  return Object.freeze(
    renderedRoutes.sort((left, right) => left.file.localeCompare(right.file))
  );
}

async function listFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, filename)));
    } else if (entry.isFile()) {
      files.push(toPosix(path.relative(root, filename)));
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function fileDetails(root, files) {
  const details = [];
  for (const file of files) {
    const buffer = await readFile(path.join(root, file));
    details.push(
      Object.freeze({
        path: file,
        bytes: buffer.length,
        sha256: createHash("sha256").update(buffer).digest("hex")
      })
    );
  }
  return Object.freeze(details);
}

async function gitCommit() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: projectRoot
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function writeManifest({ stagingDir, routes }) {
  const files = (await listFiles(stagingDir)).filter(
    (file) => file !== "release-manifest.json"
  );
  const manifest = Object.freeze({
    buildTimeUtc: new Date().toISOString(),
    gitCommit: await gitCommit(),
    routes,
    files,
    fileDetails: await fileDetails(stagingDir, files)
  });
  await writeInside(
    stagingDir,
    "release-manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return manifest;
}

async function replaceDirectoryAtomic(stagingDir, outDir) {
  const outputRoot = resolve(outDir);
  const parent = dirname(outputRoot);
  const backup = resolve(parent, `${path.basename(outputRoot)}.previous-${process.pid}`);
  const existing = await stat(outputRoot).catch(() => null);

  await mkdir(parent, { recursive: true });
  await rm(backup, { recursive: true, force: true });

  if (existing) {
    await rename(outputRoot, backup);
  }

  try {
    await rename(stagingDir, outputRoot);
  } catch (error) {
    if (existing) {
      await rename(backup, outputRoot).catch(() => {});
    }
    throw error;
  }

  await rm(backup, { recursive: true, force: true });
}

function requiredCliValue(argv, index, optionName) {
  const value = argv[index + 1];
  if (value === undefined || value.trim() === "" || value.startsWith("--")) {
    throw new Error(`${optionName} requires a non-empty value.`);
  }
  return value;
}

function requiredAssignmentValue(argument, optionName) {
  const value = argument.slice(`${optionName}=`.length);
  if (value.trim() === "") {
    throw new Error(`${optionName} requires a non-empty value.`);
  }
  return value;
}

export function parseBuildSiteCliOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--out") {
      options.outDir = resolve(projectRoot, requiredCliValue(argv, index, "--out"));
      index += 1;
    } else if (argument.startsWith("--out=")) {
      options.outDir = resolve(
        projectRoot,
        requiredAssignmentValue(argument, "--out")
      );
    } else if (argument === "--content") {
      options.contentRoot = resolve(
        projectRoot,
        requiredCliValue(argv, index, "--content")
      );
      index += 1;
    } else if (argument.startsWith("--content=")) {
      options.contentRoot = resolve(
        projectRoot,
        requiredAssignmentValue(argument, "--content")
      );
    }
  }
  return options;
}

export async function buildSite({
  routes = defaultRoutes,
  locales = LOCALES,
  contentRoot = path.join(projectRoot, "site/content"),
  outDir = path.join(projectRoot, "dist"),
  origin = DEFAULT_ORIGIN
} = {}) {
  const normalizedRoutes = normalizeRoutes(routes);
  const normalizedLocales = normalizeLocales(locales);
  const outputRoot = assertSafeOutputRoot(outDir);
  const stagingDir = stagingDirFor(outputRoot);

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });
  await copyStaticAssets(stagingDir);

  const contentByLocale = await loadContentMap(resolve(contentRoot), normalizedLocales);
  const renderedRoutes = await renderRoutes({
    stagingDir,
    routes: normalizedRoutes,
    locales: normalizedLocales,
    contentByLocale
  });

  await writeInside(stagingDir, "robots.txt", robotsTxt({ origin }));
  await writeInside(
    stagingDir,
    "sitemap.xml",
    generateSitemapXml(
      renderedRoutes.map((route) => ({
        path: route.canonicalPath,
        alternates: route.alternates
      })),
      { origin }
    )
  );

  const manifest = await writeManifest({ stagingDir, routes: renderedRoutes });
  await verifyRelease(stagingDir);
  await replaceDirectoryAtomic(stagingDir, outputRoot);
  return manifest;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const manifest = await buildSite(parseBuildSiteCliOptions(process.argv.slice(2)));
  console.log(
    `Built ${manifest.routes.length} routes and ${manifest.files.length} files into dist/.`
  );
}
