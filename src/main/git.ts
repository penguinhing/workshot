import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import type { GitInfo } from '@shared/types';

const exec = promisify(execFile);

async function gitExec(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd, windowsHide: true, maxBuffer: 1024 * 1024 * 8 });
  return stdout.trim();
}

export async function readGitInfo(projectPath: string): Promise<GitInfo> {
  if (!existsSync(projectPath)) return { isGit: false };
  if (!existsSync(join(projectPath, '.git'))) return { isGit: false };

  try {
    const [hash, branch, commitMsg, statusOut] = await Promise.all([
      gitExec(projectPath, ['rev-parse', 'HEAD']),
      gitExec(projectPath, ['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => 'HEAD'),
      gitExec(projectPath, ['log', '-1', '--pretty=%s']).catch(() => ''),
      gitExec(projectPath, ['status', '--porcelain']).catch(() => ''),
    ]);
    const dirty = statusOut ? statusOut.split('\n').filter(Boolean).length : 0;
    return {
      isGit: true,
      branch,
      commitHash: hash.slice(0, 7),
      commitMsg,
      dirty,
    };
  } catch {
    return { isGit: false };
  }
}

export async function commitExists(projectPath: string, hash: string): Promise<boolean> {
  if (!existsSync(join(projectPath, '.git'))) return false;
  try {
    await gitExec(projectPath, ['cat-file', '-e', `${hash}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

export async function gitResetHard(projectPath: string, hash: string): Promise<void> {
  await gitExec(projectPath, ['reset', '--hard', hash]);
}
