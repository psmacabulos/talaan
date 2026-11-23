// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Next.js refuses to build a "use server" file that exports anything but
 * async functions (types are fine): `export const MESSAGE = "…"` there is a
 * build error that no unit test catches, because tests mock those files
 * (Step 60.3, problem P-070). So this reads every such file and fails first.
 */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const ALLOWED_EXPORT = /^export (async function |type |interface )/;

describe('"use server" files', () => {
  const serverFiles = sourceFiles("src").filter((path) => {
    const firstCode = readFileSync(path, "utf8").trimStart();
    return firstCode.startsWith('"use server"') || firstCode.startsWith("'use server'");
  });

  it("are found", () => {
    expect(serverFiles.length).toBeGreaterThan(5);
  });

  it.each(serverFiles)("%s exports only async functions and types", (path) => {
    const bad = readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("export ") && !ALLOWED_EXPORT.test(line));
    expect(bad).toEqual([]);
  });
});
