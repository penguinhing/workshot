import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { IPC, type WindowControlAction } from '@shared/ipc';
import type {
  AppSettings,
  DBConn,
  DBTestResult,
  GitInfo,
  ProgressStep,
  RestoreMode,
  RestoreOptions,
  RestoreTargetCheck,
  SaveOptions,
  SnapshotHistoryItem,
  SnapshotManifest,
} from '@shared/types';
import { commitExists, gitResetHard, readGitInfo } from './git';
import { pgDump, pgRestore, testConnection } from './postgres';
import { formatBytes, packWorkshot, readManifestOnly, unpackWorkshot } from './workshot';
import * as storeApi from './store';

let mainWindow: BrowserWindow | null = null;

function emitProgress(jobId: string, steps: ProgressStep[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC.progressUpdate, { jobId, steps });
  }
}

function tempDirFor(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}

function validateDbAliases(dbs: DBConn[]): void {
  const counts = new Map<string, { label: string; count: number }>();
  for (const db of dbs) {
    const alias = db.name.trim();
    if (!alias) throw new Error('DB 별칭은 필수입니다');
    const key = alias.toLowerCase();
    const prev = counts.get(key);
    counts.set(key, { label: prev?.label ?? alias, count: (prev?.count ?? 0) + 1 });
  }
  const duplicated = [...counts.values()].filter((x) => x.count > 1).map((x) => x.label);
  if (duplicated.length > 0) {
    throw new Error(`DB 별칭은 중복될 수 없습니다: ${duplicated.join(', ')}`);
  }
}

export function registerIpcHandlers(window: BrowserWindow): void {
  mainWindow = window;

  ipcMain.handle(IPC.windowControl, (_e, action: WindowControlAction) => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    else if (action === 'maximize') {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    } else if (action === 'close') mainWindow.close();
  });

  ipcMain.handle(IPC.pickDirectory, async (_e, title?: string) => {
    if (!mainWindow) return null;
    const r = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: title || '프로젝트 폴더 선택',
    });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle(IPC.pickWorkshotFile, async () => {
    if (!mainWindow) return null;
    const r = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: '.workshot 파일 선택',
      filters: [{ name: 'WorkShot Snapshot', extensions: ['workshot'] }],
    });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle(IPC.pickSaveLocation, async (_e, defaultName: string) => {
    if (!mainWindow) return null;
    const r = await dialog.showSaveDialog(mainWindow, {
      title: '스냅샷 저장 위치',
      defaultPath: defaultName,
      filters: [{ name: 'WorkShot Snapshot', extensions: ['workshot'] }],
    });
    return r.canceled ? null : r.filePath;
  });

  ipcMain.handle(IPC.getGitInfo, async (_e, projectPath: string): Promise<GitInfo> => {
    return readGitInfo(projectPath);
  });

  ipcMain.handle(IPC.testDbConnection, async (_e, conn: DBConn): Promise<DBTestResult> => {
    return testConnection(conn);
  });

  ipcMain.handle(IPC.saveSnapshot, async (_e, opts: SaveOptions & { jobId: string }): Promise<SnapshotHistoryItem> => {
    validateDbAliases(opts.dbs);

    const { jobId } = opts;
    const steps: ProgressStep[] = [
      { id: 'git', label: 'Git 상태 캡처', percent: 0, status: 'pending' },
      { id: 'db', label: `DB 덤프 (${opts.dbs.length}개)`, percent: 0, status: 'pending' },
      { id: 'pack', label: '압축 & 패키징', percent: 0, status: 'pending' },
    ];
    const update = (i: number, patch: Partial<ProgressStep>) => {
      steps[i] = { ...steps[i], ...patch };
      emitProgress(jobId, steps);
    };

    update(0, { status: 'active', percent: 30 });
    const git = await readGitInfo(opts.projectPath);
    if (!git.isGit || !git.commitHash) {
      update(0, { status: 'error', detail: 'Git 저장소가 아닙니다' });
      throw new Error('Git 저장소가 아닙니다');
    }
    update(0, { status: 'done', percent: 100, detail: git.commitHash });

    const snapshotsDir = storeApi.getSnapshotsDir();
    if (!existsSync(snapshotsDir)) mkdirSync(snapshotsDir, { recursive: true });
    const ts = new Date();
    const stamp =
      `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}` +
      `-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}`;
    const fileName = `${safeName(opts.name) || 'snapshot'}-${stamp}.workshot`;
    const outputPath = join(snapshotsDir, fileName);

    const dumpDir = tempDirFor('workshot-dumps');
    const dumpFiles: { name: string; path: string }[] = [];
    const dbEntries: SnapshotManifest['dbs'] = [];

    for (let i = 0; i < opts.dbs.length; i++) {
      const db = opts.dbs[i];
      const dumpName = `${safeName(db.name || db.database)}.dump`;
      const dumpPath = join(dumpDir, dumpName);
      update(1, {
        status: 'active',
        percent: Math.round((i / opts.dbs.length) * 100),
        detail: `${db.name || db.database} (${i + 1}/${opts.dbs.length})`,
      });
      try {
        await pgDump(db, dumpPath);
      } catch (e) {
        update(1, { status: 'error', detail: (e as Error).message.slice(0, 80) });
        throw e;
      }
      const sz = statSync(dumpPath).size;
      dumpFiles.push({ name: dumpName, path: dumpPath });
      dbEntries.push({
        type: db.type,
        name: db.name || db.database,
        database: db.database,
        size: formatBytes(sz),
        dumpFile: dumpName,
      });
    }
    update(1, { status: 'done', percent: 100, detail: `${dumpFiles.length}개 완료` });

    const manifest: SnapshotManifest = {
      version: '0.1',
      name: opts.name,
      note: opts.note,
      createdAt: new Date().toISOString(),
      project: {
        path: opts.projectPath,
        branch: git.branch || '',
        commitHash: git.commitHash,
        commitMsg: git.commitMsg || '',
      },
      dbs: dbEntries,
    };

    update(2, { status: 'active', percent: 50 });
    const { size } = await packWorkshot({ manifest, dumpFiles, outFile: outputPath });
    update(2, { status: 'done', percent: 100, detail: `gzip · ${formatBytes(size)}` });

    for (const f of dumpFiles) {
      try { unlinkSync(f.path); } catch { /* ignore */ }
    }

    const item: SnapshotHistoryItem = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: manifest.name,
      note: manifest.note,
      filePath: outputPath,
      size: formatBytes(size),
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      gitHash: git.commitHash,
      branch: git.branch || '',
      commitMsg: git.commitMsg || '',
      project: opts.projectPath,
      dbs: dbEntries.map((d) => ({ type: d.type, name: d.name, database: d.database, size: d.size })),
    };
    storeApi.addHistory(item);
    storeApi.saveProjectDbs(opts.projectPath, opts.dbs);
    return item;
  });

  ipcMain.handle(IPC.validateRestoreTarget, async (_e, args: { path: string; expectedHash: string }): Promise<RestoreTargetCheck> => {
    if (!existsSync(args.path)) return { path: args.path, isGit: false, hashFound: false };
    const info = await readGitInfo(args.path);
    if (!info.isGit) return { path: args.path, isGit: false, hashFound: false };
    const found = await commitExists(args.path, args.expectedHash);
    return {
      path: args.path,
      isGit: true,
      hashFound: found,
      branch: info.branch,
      currentHash: info.commitHash,
    };
  });

  ipcMain.handle(IPC.readWorkshotManifest, async (_e, filePath: string): Promise<SnapshotManifest> => {
    return readManifestOnly(filePath);
  });

  ipcMain.handle(IPC.restoreSnapshot, async (_e, opts: RestoreOptions & { jobId: string }): Promise<{ ok: true; autoBackupPath: string | null }> => {
    const { jobId } = opts;
    const mode: RestoreMode = opts.mode === 'dbOnly' ? 'dbOnly' : 'full';
    const isFullRestore = mode === 'full';
    const shouldAutoBackup = opts.autoBackup !== false;
    let autoBackupPath: string | null = null;
    const steps: ProgressStep[] = [
      { id: 'verify', label: '파일 검증', percent: 0, status: 'pending' },
    ];
    if (shouldAutoBackup) {
      steps.push({ id: 'backup', label: '현재 상태 자동 백업', percent: 0, status: 'pending' });
    }
    if (isFullRestore) {
      steps.push({ id: 'git', label: 'Git reset --hard', percent: 0, status: 'pending' });
    }
    steps.push({ id: 'db', label: `DB 재생성 및 복원 (${opts.dbs.length}개)`, percent: 0, status: 'pending' });
    const backupStepIndex = steps.findIndex((s) => s.id === 'backup');
    const gitStepIndex = steps.findIndex((s) => s.id === 'git');
    const dbStepIndex = steps.findIndex((s) => s.id === 'db');
    const update = (i: number, patch: Partial<ProgressStep>) => {
      steps[i] = { ...steps[i], ...patch };
      emitProgress(jobId, steps);
    };

    update(0, { status: 'active', percent: 50 });
    const { manifest, dumpPaths } = await unpackWorkshot(opts.workshotPath);
    update(0, { status: 'done', percent: 100, detail: 'OK' });

    if (shouldAutoBackup) {
      update(backupStepIndex, { status: 'active', percent: 20 });
      const targetGit = await readGitInfo(opts.targetProjectPath);
      const backupName = `auto-backup-${Date.now()}.workshot`;
      const autoBackupDir = join(storeApi.getBaseDir(), 'auto-backups');
      const backupPath = join(autoBackupDir, backupName);
      mkdirSync(autoBackupDir, { recursive: true });
      const backupDir = tempDirFor('workshot-autobk');
      const backupDumpFiles: { name: string; path: string }[] = [];
      const backupDbs: SnapshotManifest['dbs'] = [];
      for (const db of opts.dbs) {
        try {
          const fname = `${safeName(db.name || db.database)}.dump`;
          const fpath = join(backupDir, fname);
          await pgDump(db, fpath);
          backupDumpFiles.push({ name: fname, path: fpath });
          backupDbs.push({
            type: db.type,
            name: db.name || db.database,
            database: db.database,
            size: formatBytes(statSync(fpath).size),
            dumpFile: fname,
          });
        } catch {
          // 개별 DB 백업 실패는 경고만, 진행은 계속
        }
      }
      const backupManifest: SnapshotManifest = {
        version: '0.1',
        name: `auto-backup ${new Date().toLocaleString('ko-KR', { hour12: false })}`,
        note: '복원 직전 자동 백업',
        createdAt: new Date().toISOString(),
        project: {
          path: opts.targetProjectPath,
          branch: targetGit.branch || '',
          commitHash: targetGit.commitHash || '',
          commitMsg: targetGit.commitMsg || '',
        },
        dbs: backupDbs,
      };
      await packWorkshot({ manifest: backupManifest, dumpFiles: backupDumpFiles, outFile: backupPath });
      for (const f of backupDumpFiles) { try { unlinkSync(f.path); } catch { /* ignore */ } }
      autoBackupPath = backupPath;
      update(backupStepIndex, { status: 'done', percent: 100, detail: backupName });
    }

    if (isFullRestore) {
      update(gitStepIndex, { status: 'active', percent: 30 });
      try {
        await gitResetHard(opts.targetProjectPath, manifest.project.commitHash);
      } catch (e) {
        update(gitStepIndex, { status: 'error', detail: (e as Error).message.slice(0, 80) });
        throw e;
      }
      update(gitStepIndex, { status: 'done', percent: 100, detail: manifest.project.commitHash });
    }

    for (let i = 0; i < opts.dbs.length; i++) {
      const db = opts.dbs[i];
      const targetEntry =
        manifest.dbs.find((m) => m.name === (db.name || db.database)) ||
        manifest.dbs.find((m) => m.database === db.database) ||
        manifest.dbs[i];
      if (!targetEntry) {
        update(dbStepIndex, {
          status: 'error',
          detail: `매칭되는 DB 덤프 없음: ${db.name || db.database}`,
        });
        throw new Error(`매칭되는 DB 덤프를 찾을 수 없습니다: ${db.name || db.database}`);
      }
      const dumpPath = dumpPaths[targetEntry.dumpFile];
      if (!dumpPath) throw new Error(`덤프 파일이 누락되었습니다: ${targetEntry.dumpFile}`);
      update(dbStepIndex, {
        status: 'active',
        percent: Math.round((i / opts.dbs.length) * 100),
        detail: `${db.name || db.database} (${i + 1}/${opts.dbs.length})`,
      });
      try {
        await pgRestore(db, dumpPath);
      } catch (e) {
        update(dbStepIndex, { status: 'error', detail: (e as Error).message.slice(0, 80) });
        throw e;
      }
    }
    update(dbStepIndex, { status: 'done', percent: 100, detail: `${opts.dbs.length}개 완료` });

    // Reuse the credentials next time this target project is restored/saved.
    storeApi.saveProjectDbs(opts.targetProjectPath, opts.dbs);

    return { ok: true, autoBackupPath };
  });

  ipcMain.handle(IPC.listHistory, async () => storeApi.syncSnapshotsHistory());
  ipcMain.handle(IPC.removeHistory, async (_e, args: string | { id: string; filePath?: string }) => {
    if (typeof args === 'string') storeApi.removeHistory(args);
    else storeApi.removeHistory(args.id, args.filePath);
  });
  ipcMain.handle(IPC.listProfiles, async () => storeApi.listProfiles());
  ipcMain.handle(IPC.saveProfile, async (_e, p) => storeApi.saveProfile(p));
  ipcMain.handle(IPC.removeProfile, async (_e, id: string) => storeApi.removeProfile(id));
  ipcMain.handle(IPC.getProjectDbs, async (_e, projectPath: string) =>
    storeApi.getProjectDbs(projectPath),
  );
  ipcMain.handle(IPC.saveProjectDbs, async (_e, args: { projectPath: string; dbs: DBConn[] }) =>
    storeApi.saveProjectDbs(args.projectPath, args.dbs),
  );
  ipcMain.handle(IPC.getAppSettings, async () => storeApi.getAppSettings());
  ipcMain.handle(IPC.saveAppSettings, async (_e, settings: Partial<AppSettings>) => storeApi.saveAppSettings(settings));

  ipcMain.handle(IPC.openInFolder, async (_e, filePath: string) => {
    if (existsSync(filePath)) shell.showItemInFolder(filePath);
  });

  ipcMain.handle(IPC.getSnapshotsDir, async () => storeApi.getSnapshotsDir());
}
