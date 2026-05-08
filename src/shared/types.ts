// Shared types between main and renderer.

export type DBType = 'postgres' | 'mysql' | 'mongo' | 'redis';

export interface DBConn {
  id: string;
  type: DBType;
  name: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

export interface GitInfo {
  isGit: boolean;
  branch?: string;
  commitHash?: string;
  commitMsg?: string;
  dirty?: number;
}

export interface SnapshotManifest {
  version: '0.1';
  name: string;
  note: string;
  createdAt: string;
  project: {
    path: string;
    branch: string;
    commitHash: string;
    commitMsg: string;
  };
  dbs: SnapshotDBEntry[];
}

export interface SnapshotDBEntry {
  type: DBType;
  name: string;
  database: string;
  size: string;
  dumpFile: string;
}

export interface SnapshotHistoryItem {
  id: string;
  name: string;
  note: string;
  filePath: string;
  size: string;
  timestamp: string;
  gitHash: string;
  branch: string;
  commitMsg: string;
  project: string;
  dbs: { type: DBType; name: string; database?: string; size: string }[];
}

export interface DBProfile {
  id: string;
  type: DBType;
  name: string;
  host: string;
  port: string;
  user: string;
  database: string;
}

export type StepStatus = 'pending' | 'active' | 'done' | 'error';
export interface ProgressStep {
  id: string;
  label: string;
  percent: number;
  status: StepStatus;
  detail?: string;
}

export interface ProgressUpdate {
  jobId: string;
  steps: ProgressStep[];
}

export interface AppSettings {
  restoreAutoBackup: boolean;
}

export interface SaveOptions {
  projectPath: string;
  dbs: DBConn[];
  name: string;
  note: string;
}

export interface RestoreTargetCheck {
  path: string;
  isGit: boolean;
  hashFound: boolean;
  branch?: string;
  currentHash?: string;
}

export type RestoreMode = 'full' | 'dbOnly';

export interface RestoreOptions {
  workshotPath: string;
  targetProjectPath: string;
  dbs: DBConn[];
  autoBackup?: boolean;
  mode?: RestoreMode;
}

export interface DBTestResult {
  ok: boolean;
  message: string;
}
