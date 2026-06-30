const THUMBNAIL_FIXED_BYTES = 64_000_000 + 32_000_000 + (2 * 200_000 * 4 * 2);

export function createManagedPages(documentId, pageCount) {
  if (!documentId || !Number.isInteger(pageCount) || pageCount < 1) return [];
  return Array.from({ length: pageCount }, (_, originalIndex) => Object.freeze({
    id: `${documentId}:${originalIndex}`,
    originalIndex,
    rotation: 0,
    removed: false
  }));
}

export function moveManagedPage(pages, id, direction) {
  const index = pages.findIndex((page) => page.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= pages.length) return pages;
  const next = [...pages];
  const [page] = next.splice(index, 1);
  next.splice(target, 0, page);
  return next;
}

export function rotateManagedPage(pages, id) {
  return pages.map((page) => page.id === id ? Object.freeze({ ...page, rotation: (page.rotation + 90) % 360 }) : page);
}

export function toggleManagedPage(pages, id) {
  return pages.map((page) => page.id === id ? Object.freeze({ ...page, removed: !page.removed }) : page);
}

export function shouldRenderThumbnails({ inputBytes, pageCount }) {
  const estimate = inputBytes * 3 + THUMBNAIL_FIXED_BYTES;
  return Number.isFinite(inputBytes)
    && inputBytes > 0
    && inputBytes <= 30_000_000
    && Number.isInteger(pageCount)
    && pageCount > 0
    && pageCount <= 100
    && estimate <= 160_000_000;
}
