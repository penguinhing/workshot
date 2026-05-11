// IPC channel names — single source of truth.

export const IPC = {
  pickDirectory: 'workshot:pickDirectory',
  pickWorkshotFile: 'workshot:pickWorkshotFile',
  pickSaveLocation: 'workshot:pickSaveLocation',
  getGitInfo: 'workshot:getGitInfo',
  testDbConnection: 'workshot:testDbConnection',
  saveSnapshot: 'workshot:saveSnapshot',
  validateRestoreTarget: 'workshot:validateRestoreTarget',
  readWorkshotManifest: 'workshot:readWorkshotManifest',
  restoreSnapshot: 'workshot:restoreSnapshot',
  listHistory: 'workshot:listHistory',
  removeHistory: 'workshot:removeHistory',
  listProfiles: 'workshot:listProfiles',
  saveProfile: 'workshot:saveProfile',
  removeProfile: 'workshot:removeProfile',
  getProjectDbs: 'workshot:getProjectDbs',
  saveProjectDbs: 'workshot:saveProjectDbs',
  getAppSettings: 'workshot:getAppSettings',
  saveAppSettings: 'workshot:saveAppSettings',
  getAppVersion: 'workshot:getAppVersion',
  openInFolder: 'workshot:openInFolder',
  getSnapshotsDir: 'workshot:getSnapshotsDir',
  windowControl: 'workshot:windowControl',
  // events
  progressUpdate: 'workshot:progressUpdate',
} as const;

export type WindowControlAction = 'minimize' | 'maximize' | 'close';
