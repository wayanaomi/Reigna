import fs from "node:fs";
import path from "node:path";

const CANDIDATE_PATHS = ["reigna-wordmark.svg", "reigna-wordmark.png"];

/**
 * Server-only helper. Never import this from a "use client" component —
 * it uses Node's fs/path modules, which cannot be bundled for the browser.
 * Resolve the path in a Server Component and pass the result down as a
 * plain string prop instead.
 */
export function resolveWordmarkAsset(): string | null {
  for (const file of CANDIDATE_PATHS) {
    const abs = path.join(process.cwd(), "public", "brand", file);
    if (fs.existsSync(abs)) return `/brand/${file}`;
  }
  return null;
}
