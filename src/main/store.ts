import { app } from 'electron';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'fs';
import { createHash } from 'crypto';
import { dirname, join, relative, resolve, sep } from 'path';
import Store from 'electron-store';
import type { SnapshotHistoryItem, DBProfile, DBConn, AppSettings } from '@shared/types';
import { formatBytes, readManifestOnly } from './workshot';

interface Schema {
  history: SnapshotHistoryItem[];
  profiles: DBProfile[];
  projectDbs: Record<string, DBConn[]>;
  settings: AppSettings;
}

// Dev mode uses the project root. Packaged builds use AppData so reinstalling does not remove snapshots.
const packagedDataDirName = 'WorkShot';
const portableDataDirs = ['snapshots', 'auto-backups'] as const;

function getPackagedDataDir(): string {
  return join(app.getPath('appData'), packagedDataDirName);
}

function getLegacyPackageDir(): string | null {
  if (!app.isPackaged) return null;
  return dirname(app.getPath('exe'));
}

export function getBaseDir(): string {
  return app.isPackaged ? getPackagedDataDir() : app.getAppPath();
}

export function getSnapshotsDir(): string {
  return join(getBaseDir(), 'snapshots');
}

function pathKey(filePath: string): string {
  const key = resolve(filePath);
  return process.platform === 'win32' ? key.toLowerCase() : key;
}

function samePath(a: string, b: string): boolean {
  return pathKey(a) === pathKey(b);
}

function isPathAtOrInside(childPath: string, parentPath: string): boolean {
  const child = pathKey(childPath);
  const parent = pathKey(parentPath);
  return child === parent || child.startsWith(parent.endsWith(sep) ? parent : `${parent}${sep}`);
}

function copyFileIfMissing(source: string, target: string): void {
  if (!existsSync(source) || existsSync(target)) return;
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function copyDirectoryContentsIfMissing(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) return;
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const source = join(sourceDir, entry.name);
    const target = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryContentsIfMissing(source, target);
    } else if (entry.isFile()) {
      copyFileIfMissing(source, target);
    }
  }
}

function migrateLegacyPackageData(): void {
  const legacyDir = getLegacyPackageDir();
  if (!legacyDir || samePath(legacyDir, getBaseDir())) return;

  try {
    mkdirSync(getBaseDir(), { recursive: true });
    copyFileIfMissing(join(legacyDir, 'workshot.json'), join(getBaseDir(), 'workshot.json'));

    for (const dir of portableDataDirs) {
      copyDirectoryContentsIfMissing(join(legacyDir, dir), join(getBaseDir(), dir));
    }
  } catch (e) {
    console.warn('[workshot] failed to migrate legacy package data', e);
  }
}

migrateLegacyPackageData();

const store = new Store<Schema>({
  defaults: {
    history: [],
    profiles: [],
    projectDbs: {},
    settings: { restoreAutoBackup: true },
  },
  name: 'workshot',
  cwd: getBaseDir(),
});

function migrateLegacyHistoryPaths(): void {
  const legacyDir = getLegacyPackageDir();
  if (!legacyDir || samePath(legacyDir, getBaseDir())) return;

  const legacySnapshotsDir = join(legacyDir, 'snapshots');
  const snapshotsDir = getSnapshotsDir();
  const history = store.get('history') ?? [];
  let changed = false;

  const next = history.map((item) => {
    const itemPath = resolve(item.filePath);
    let candidate: string | null = null;

    if (isPathAtOrInside(itemPath, legacySnapshotsDir)) {
      candidate = join(snapshotsDir, relative(legacySnapshotsDir, itemPath));
    } else if (!existsSync(itemPath)) {
      candidate = join(snapshotsDir, itemPath.split(/[\\/]/).pop() ?? '');
    }

    if (candidate && existsSync(candidate) && !samePath(item.filePath, candidate)) {
      changed = true;
      return { ...item, filePath: candidate };
    }

    return item;
  });

  if (changed) store.set('history', next);
}

migrateLegacyHistoryPaths();

function projectDbKey(projectPath: string): string | null {
  const trimmed = projectPath.trim();
  if (!trimmed) return null;
  const key = resolve(trimmed);
  return process.platform === 'win32' ? key.toLowerCase() : key;
}

function findProjectDbEntry(
  map: Record<string, DBConn[]>,
  projectPath: string,
): { key: string; dbs: DBConn[] } | null {
  const key = projectDbKey(projectPath);
  if (!key) return null;
  if (map[key]) return { key, dbs: map[key] };
  if (map[projectPath]) return { key: projectPath, dbs: map[projectPath] };

  const existingKey = Object.keys(map).find((candidate) => projectDbKey(candidate) === key);
  return existingKey ? { key: existingKey, dbs: map[existingKey] } : null;
}

export function listHistory(): SnapshotHistoryItem[] {
  return store.get('history') ?? [];
}

function historyPathKey(filePath: string): string {
  return pathKey(filePath);
}

function snapshotIdForPath(filePath: string): string {
  return `fs-${createHash('sha1').update(historyPathKey(filePath)).digest('hex')}`;
}

function displayTimestamp(value: string, fallback: Date): string {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? fallback : date;
  return safeDate.toLocaleString('ko-KR', { hour12: false });
}

function sortTime(item: SnapshotHistoryItem): number {
  try {
    return statSync(item.filePath).mtimeMs;
  } catch {
    return 0;
  }
}

export async function syncSnapshotsHistory(): Promise<SnapshotHistoryItem[]> {
  const snapshotsDir = getSnapshotsDir();
  if (!existsSync(snapshotsDir)) return listHistory();

  const history = listHistory();
  const knownPaths = new Set(history.map((item) => historyPathKey(item.filePath)));
  const discovered: SnapshotHistoryItem[] = [];

  for (const entry of readdirSync(snapshotsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.workshot')) continue;

    const filePath = join(snapshotsDir, entry.name);
    const key = historyPathKey(filePath);
    if (knownPaths.has(key)) continue;

    try {
      const stat = statSync(filePath);
      const manifest = await readManifestOnly(filePath);
      discovered.push({
        id: snapshotIdForPath(filePath),
        name: manifest.name || entry.name.replace(/\.workshot$/i, ''),
        note: manifest.note,
        filePath,
        size: formatBytes(stat.size),
        timestamp: displayTimestamp(manifest.createdAt, stat.mtime),
        gitHash: manifest.project.commitHash,
        branch: manifest.project.branch,
        commitMsg: manifest.project.commitMsg,
        project: manifest.project.path,
        dbs: manifest.dbs.map((d) => ({
          type: d.type,
          name: d.name,
          database: d.database,
          size: d.size,
        })),
      });
      knownPaths.add(key);
    } catch (e) {
      console.warn(`[workshot] skipped invalid snapshot: ${filePath}`, e);
    }
  }

  if (discovered.length === 0) return history;

  const next = [...discovered.sort((a, b) => sortTime(b) - sortTime(a)), ...history];
  store.set('history', next);
  return next;
}

// Drop history entries whose .workshot file no longer exists on disk.
// Returns the number of removed entries.
export function pruneMissingHistory(): number {
  const list = listHistory();
  const kept = list.filter((x) => existsSync(x.filePath));
  if (kept.length !== list.length) {
    store.set('history', kept);
  }
  return list.length - kept.length;
}

export function addHistory(item: SnapshotHistoryItem): void {
  const itemPathKey = historyPathKey(item.filePath);
  const list = listHistory().filter((x) => historyPathKey(x.filePath) !== itemPathKey);
  list.unshift(item);
  store.set('history', list.slice(0, 50));
}

export function removeHistory(id: string, fallbackFilePath?: string): void {
  const list = listHistory();
  const item = list.find((x) => x.id === id);
  const filePath = item?.filePath ?? fallbackFilePath;
  if (filePath && existsSync(filePath)) {
    if (!filePath.toLowerCase().endsWith('.workshot')) {
      throw new Error(`.workshot 파일만 삭제할 수 있습니다: ${filePath}`);
    }
    unlinkSync(filePath);
  }
  store.set('history', list.filter((x) => x.id !== id));
}

export function listProfiles(): DBProfile[] {
  return store.get('profiles') ?? [];
}

export function saveProfile(profile: DBProfile): void {
  const list = listProfiles().filter((x) => x.id !== profile.id);
  list.unshift(profile);
  store.set('profiles', list);
}

export function removeProfile(id: string): void {
  store.set('profiles', listProfiles().filter((x) => x.id !== id));
}

export function getProjectDbs(projectPath: string): DBConn[] {
  const map = store.get('projectDbs') ?? {};
  return findProjectDbEntry(map, projectPath)?.dbs ?? [];
}

export function saveProjectDbs(projectPath: string, dbs: DBConn[]): void {
  const key = projectDbKey(projectPath);
  if (!key) return;
  const map = { ...(store.get('projectDbs') ?? {}) };
  const existing = findProjectDbEntry(map, projectPath);
  if (existing && existing.key !== key) delete map[existing.key];
  map[key] = dbs;
  store.set('projectDbs', map);
}

export function getAppSettings(): AppSettings {
  const settings = store.get('settings');
  return {
    restoreAutoBackup: settings?.restoreAutoBackup ?? true,
  };
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  const next = { ...getAppSettings(), ...settings };
  store.set('settings', next);
  return next;
}
