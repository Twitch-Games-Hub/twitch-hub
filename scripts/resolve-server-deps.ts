/**
 * Recursively resolves all transitive dependencies from Bun's .bun store
 * into a flat node_modules/ directory that Node.js can resolve.
 *
 * Bun stores packages in node_modules/.bun/<pkg>/node_modules/ with symlinks.
 * Each workspace only gets symlinks to its direct deps. This script walks
 * the full dependency tree so transitive deps are also present.
 */

import {
  readdirSync,
  lstatSync,
  readlinkSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { resolve, join, dirname } from 'node:path';

const ROOT = '/app';
const SERVER_NODE_MODULES = join(ROOT, 'apps/server/node_modules');
const TARGET = join(ROOT, 'node_modules');
const BUN_STORE = join(ROOT, 'node_modules/.bun');

const visitedStoreEntries = new Set<string>();

function copyPackage(realPath: string, targetPath: string): void {
  try {
    const stat = lstatSync(targetPath);
    if (stat.isDirectory()) return; // Already a real directory, skip
    // Symlink or file — remove to replace with real copy
    rmSync(targetPath);
  } catch {
    // Doesn't exist, will create
  }
  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(realPath, targetPath, { recursive: true });
}

/**
 * Given a .bun store entry's node_modules dir (e.g. .bun/@sentry+node@1.0.0/node_modules/),
 * iterate its contents and recursively resolve all transitive deps.
 */
function processStoreNodeModules(storeNmDir: string): void {
  if (visitedStoreEntries.has(storeNmDir)) return;
  visitedStoreEntries.add(storeNmDir);

  if (!existsSync(storeNmDir)) return;

  for (const entry of readdirSync(storeNmDir)) {
    // Skip hidden dirs (.bin, .cache, etc.)
    if (entry.startsWith('.')) continue;

    const entryPath = join(storeNmDir, entry);
    const stat = lstatSync(entryPath);

    if (entry.startsWith('@')) {
      // Scoped package directory — iterate children
      if (stat.isDirectory() || stat.isSymbolicLink()) {
        const scopeDir = stat.isSymbolicLink()
          ? resolve(dirname(entryPath), readlinkSync(entryPath))
          : entryPath;
        if (!existsSync(scopeDir)) continue;

        for (const child of readdirSync(scopeDir)) {
          if (child.startsWith('.')) continue;
          const childPath = join(scopeDir, child);
          const childStat = lstatSync(childPath);
          const pkgName = `${entry}/${child}`;
          const targetPath = join(TARGET, pkgName);

          if (childStat.isSymbolicLink()) {
            const realPath = resolve(dirname(childPath), readlinkSync(childPath));
            copyPackage(realPath, targetPath);
            // Find the store entry this symlink came from and recurse
            const storeParent = findStoreNodeModules(realPath);
            if (storeParent) processStoreNodeModules(storeParent);
          } else if (childStat.isDirectory()) {
            // Real directory (the package itself) — copy it
            copyPackage(childPath, targetPath);
          }
        }
      }
    } else if (stat.isSymbolicLink()) {
      // Unscoped package symlink
      const realPath = resolve(dirname(entryPath), readlinkSync(entryPath));
      const targetPath = join(TARGET, entry);
      copyPackage(realPath, targetPath);
      // Find the store entry and recurse into its deps
      const storeParent = findStoreNodeModules(realPath);
      if (storeParent) processStoreNodeModules(storeParent);
    } else if (stat.isDirectory()) {
      // Real directory (the package itself) — copy it
      const targetPath = join(TARGET, entry);
      copyPackage(entryPath, targetPath);
    }
  }
}

/**
 * Given a real path to a package inside the .bun store, find the parent
 * store entry's node_modules/ dir so we can recurse into its siblings.
 *
 * Example: .bun/@sentry+core@1.0.0/node_modules/@sentry/core
 *   → .bun/@sentry+core@1.0.0/node_modules/
 *
 * But we want the store entry that DEPENDS on this package, not this package's
 * own store entry. The symlink target already tells us the store entry.
 * However, what we really need is to process the node_modules/ dir that
 * CONTAINS the package — i.e., find the store entry whose node_modules/ dir
 * houses the package and its transitive deps as siblings.
 *
 * For .bun/@sentry+node@1.0.0/node_modules/@sentry/core (symlink target):
 *   → The containing node_modules is .bun/@sentry+core@1.0.0/node_modules/
 *   → But the REFERRING store entry is .bun/@sentry+node@1.0.0/node_modules/
 *
 * Actually: the symlink in .bun/@sentry+node@.../node_modules/@sentry/core
 * points to .bun/@sentry+core@.../node_modules/@sentry/core
 * So the realPath's parent node_modules is the @sentry+core store entry.
 * We need to process THAT store entry's node_modules too.
 */
function findStoreNodeModules(realPath: string): string | null {
  // Walk up to find the node_modules dir containing this package
  // realPath example: /app/node_modules/.bun/@sentry+core@1.0.0/node_modules/@sentry/core
  // We want: /app/node_modules/.bun/@sentry+core@1.0.0/node_modules/
  let dir = realPath;
  for (let i = 0; i < 10; i++) {
    const parent = dirname(dir);
    if (parent === dir) return null; // reached root
    if (parent.endsWith('/node_modules') || parent === 'node_modules') {
      // Check this is inside .bun store
      if (parent.includes('/.bun/')) {
        return parent;
      }
      return null;
    }
    dir = parent;
  }
  return null;
}

// Start: process the server's node_modules
console.log('Resolving server transitive dependencies...');

for (const entry of readdirSync(SERVER_NODE_MODULES)) {
  if (entry.startsWith('.')) continue;

  const entryPath = join(SERVER_NODE_MODULES, entry);
  const stat = lstatSync(entryPath);

  if (entry.startsWith('@')) {
    // Scoped directory — iterate children
    const scopeDir = stat.isSymbolicLink()
      ? resolve(dirname(entryPath), readlinkSync(entryPath))
      : entryPath;
    if (!existsSync(scopeDir)) continue;

    for (const child of readdirSync(scopeDir)) {
      if (child.startsWith('.')) continue;
      const childPath = join(scopeDir, child);
      const childStat = lstatSync(childPath);
      const pkgName = `${entry}/${child}`;
      const targetPath = join(TARGET, pkgName);

      if (childStat.isSymbolicLink()) {
        const realPath = resolve(dirname(childPath), readlinkSync(childPath));
        copyPackage(realPath, targetPath);
        const storeParent = findStoreNodeModules(realPath);
        if (storeParent) processStoreNodeModules(storeParent);
      } else if (childStat.isDirectory()) {
        copyPackage(childPath, targetPath);
      }
    }
  } else if (stat.isSymbolicLink()) {
    const realPath = resolve(dirname(entryPath), readlinkSync(entryPath));
    const targetPath = join(TARGET, entry);
    copyPackage(realPath, targetPath);
    const storeParent = findStoreNodeModules(realPath);
    if (storeParent) processStoreNodeModules(storeParent);
  } else if (stat.isDirectory()) {
    copyPackage(entryPath, join(TARGET, entry));
  }
}

console.log(`Done. Processed ${visitedStoreEntries.size} store entries.`);
