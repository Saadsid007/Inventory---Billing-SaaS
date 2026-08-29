/**
 * Product limits.
 *
 * These live in `shared` rather than beside the server action that enforces
 * them, because a `'use server'` file may only export async functions — a
 * constant exported from one is a build error, not just bad style. Keeping
 * them here also means the form and the action cannot disagree about the limit.
 */

/** Build spec Phase 1b: at most 5 images per product. */
export const MAX_IMAGES_PER_PRODUCT = 5;

/** Upload ceiling after the browser has converted to webp. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Longest edge, in pixels, that a catalog photo is resized to before upload. */
export const MAX_IMAGE_EDGE = 1200;

export const WEBP_QUALITY = 0.82;
