import { app } from 'electron';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import Store from 'electron-store';
import type { SnapshotHistoryItem, DBProfile, DBConn } from '@shared/types';

interface Schema {
  history: SnapshotHistoryItem[];
  profiles: DBProfile[];
  projectDbs: Record<string, DBConn[]>;
}

// "Package path": the folder where workshot.json lives.
// Dev mode → project root; packaged → folder containing the exe.
export function getBaseDir(): string {
  return app.isPackaged ? dirname(app.getPath('exe')) : app.getAppPath();
}

const store = new Store<Schema>({
  defaults: { history: [], profiles: [], projectDbs: {} },
  name: 'workshot',
  cwd: getBaseDir(),
});

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
  const list = listHistory().filter((x) => x.filePath !== item.filePath);
  list.unshift(item);
  store.set('history', list.slice(0, 50));
}

export function removeHistory(id: string): void {
  store.set('history', listHistory().filter((x) => x.id !== id));
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
