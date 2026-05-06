import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type WindowControlAction } from '../shared/ipc';
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
} from '../shared/types';

const api = {
  windowControl: (a: WindowControlAction) => ipcRenderer.invoke(IPC.windowControl, a),
  pickDirectory: (title?: string): Promise<string | null> => ipcRenderer.invoke(IPC.pickDirectory, title),
  pickWorkshotFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.pickWorkshotFile),
  pickSaveLocation: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.pickSaveLocation, defaultName),
  getGitInfo: (path: string): Promise<GitInfo> => ipcRenderer.invoke(IPC.getGitInfo, path),
  testDbConnection: (conn: DBConn): Promise<DBTestResult> => ipcRenderer.invoke(IPC.testDbConnection, conn),
  saveSnapshot: (opts: SaveOptions & { jobId: string }): Promise<SnapshotHistoryItem> =>
    ipcRenderer.invoke(IPC.saveSnapshot, opts),
  validateRestoreTarget: (args: { path: string; expectedHash: string }): Promise<RestoreTargetCheck> =>
    ipcRenderer.invoke(IPC.validateRestoreTarget, args),
  readWorkshotManifest: (filePath: string): Promise<SnapshotManifest> =>
    ipcRenderer.invoke(IPC.readWorkshotManifest, filePath),
  restoreSnapshot: (opts: RestoreOptions & { jobId: string }): Promise<{ ok: true; autoBackupPath: string | null }> =>
    ipcRenderer.invoke(IPC.restoreSnapshot, opts),
  listHistory: (): Promise<SnapshotHistoryItem[]> => ipcRenderer.invoke(IPC.listHistory),
  removeHistory: (id: string) => ipcRenderer.invoke(IPC.removeHistory, id),
  listProfiles: (): Promise<DBProfile[]> => ipcRenderer.invoke(IPC.listProfiles),
  saveProfile: (p: DBProfile) => ipcRenderer.invoke(IPC.saveProfile, p),
  removeProfile: (id: string) => ipcRenderer.invoke(IPC.removeProfile, id),
  getProjectDbs: (projectPath: string): Promise<DBConn[]> =>
    ipcRenderer.invoke(IPC.getProjectDbs, projectPath),
  saveProjectDbs: (projectPath: string, dbs: DBConn[]): Promise<void> =>
    ipcRenderer.invoke(IPC.saveProjectDbs, { projectPath, dbs }),
  openInFolder: (filePath: string) => ipcRenderer.invoke(IPC.openInFolder, filePath),
  getSnapshotsDir: (): Promise<string> => ipcRenderer.invoke(IPC.getSnapshotsDir),
  onProgress: (cb: (p: ProgressUpdate) => void): (() => void) => {
    const listener = (_: unknown, payload: ProgressUpdate) => cb(payload);
    ipcRenderer.on(IPC.progressUpdate, listener);
    return () => {
      ipcRenderer.removeListener(IPC.progressUpdate, listener);
    };
  },
};

contextBridge.exposeInMainWorld('workshot', api);

export type WorkShotApi = typeof api;
