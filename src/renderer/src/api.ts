// Type-safe wrapper around the preload-exposed `window.workshot` API.
import type {
  DBConn,
  DBProfile,
  DBTestResult,
  GitInfo,
  ProgressUpdate,
  RestoreOptions,
  RestoreTargetCheck,
  SaveOptions,
  SnapshotHistoryItem,
  SnapshotManifest,
} from '@shared/types';

type WindowControlAction = 'minimize' | 'maximize' | 'close';

export interface WorkShotApi {
  windowControl: (a: WindowControlAction) => Promise<void>;
  pickDirectory: (title?: string) => Promise<string | null>;
  pickWorkshotFile: () => Promise<string | null>;
  pickSaveLocation: (defaultName: string) => Promise<string | null>;
  getGitInfo: (path: string) => Promise<GitInfo>;
  testDbConnection: (conn: DBConn) => Promise<DBTestResult>;
  saveSnapshot: (opts: SaveOptions & { jobId: string }) => Promise<SnapshotHistoryItem>;
  validateRestoreTarget: (args: { path: string; expectedHash: string }) => Promise<RestoreTargetCheck>;
  readWorkshotManifest: (filePath: string) => Promise<SnapshotManifest>;
  restoreSnapshot: (
    opts: RestoreOptions & { jobId: string },
  ) => Promise<{ ok: true; autoBackupPath: string | null }>;
  listHistory: () => Promise<SnapshotHistoryItem[]>;
  removeHistory: (id: string, filePath?: string) => Promise<void>;
  listProfiles: () => Promise<DBProfile[]>;
  saveProfile: (p: DBProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  getProjectDbs: (projectPath: string) => Promise<DBConn[]>;
  saveProjectDbs: (projectPath: string, dbs: DBConn[]) => Promise<void>;
  openInFolder: (filePath: string) => Promise<void>;
  getSnapshotsDir: () => Promise<string>;
  onProgress: (cb: (p: ProgressUpdate) => void) => () => void;
}

declare global {
  interface Window {
    workshot: WorkShotApi;
  }
}

export const api = (): WorkShotApi => window.workshot;
