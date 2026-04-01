import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockFile = join(projectRoot, ".next", "dev", "lock");

if (existsSync(lockFile)) {
  try {
    rmSync(lockFile);
  } catch {
    /* another running dev server may hold the lock; next dev will report clearly */
  }
}
