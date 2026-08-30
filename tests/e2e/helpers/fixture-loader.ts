import { accessSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureManifest, type FixtureEntry, type FixtureKey } from '../../fixtures/manifest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../../fixtures');

export interface FixtureLoader {
  get(key: FixtureKey): string;
  listByFormat(format: string): string[];
  listByTier(tier: string): string[];
  assertRequired(): void;
}

export function createFixtureLoader(): FixtureLoader {
  const entries = fixtureManifest as readonly FixtureEntry[];

  return {
    get(key: FixtureKey): string {
      const entry = entries.find((e) => e.key === key);
      if (!entry) throw new Error(`Unknown fixture key: ${key}`);
      return resolve(fixturesDir, entry.path);
    },
    listByFormat(format: string): string[] {
      return entries.filter((e) => e.format === format).map((e) => resolve(fixturesDir, e.path));
    },
    listByTier(tier: string): string[] {
      return entries.filter((e) => e.sizeTier === tier).map((e) => resolve(fixturesDir, e.path));
    },
    assertRequired(): void {
      const missing: string[] = [];
      for (const entry of entries) {
        try {
          accessSync(resolve(fixturesDir, entry.path));
        } catch {
          missing.push(entry.path);
        }
      }
      if (missing.length > 0) {
        throw new Error(`Missing fixture files: ${missing.join(', ')}`);
      }
    },
  };
}

export const fixtures = createFixtureLoader();