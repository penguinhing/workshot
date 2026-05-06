import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import type { DBConn, DBTestResult } from '@shared/types';

interface RunOpts {
  bin: string;
  args: string[];
  env?: Record<string, string>;
  stdoutFile?: string;
  stdinFile?: string;
  onStderr?: (chunk: string) => void;
}

function pgEnv(conn: DBConn, extra?: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {
    PGHOST: conn.host || 'localhost',
    PGPORT: conn.port || '5432',
    PGUSER: conn.user || '',
    PGDATABASE: conn.database || '',
    PGPASSWORD: conn.password || '',
    PGCLIENTENCODING: 'UTF8',
    ...(extra || {}),
  };
  return env;
}

function runCmd(opts: RunOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(opts.bin, opts.args, {
      env: { ...process.env, ...(opts.env || {}) },
      windowsHide: true,
    });
    if (opts.stdoutFile) proc.stdout.pipe(createWriteStream(opts.stdoutFile));
    if (opts.stdinFile) createReadStream(opts.stdinFile).pipe(proc.stdin);
    let stderr = '';
    proc.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      opts.onStderr?.(s);
    });
    proc.on('error', (e) => reject(e));
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${opts.bin} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

export async function testConnection(conn: DBConn): Promise<DBTestResult> {
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('psql', ['-c', 'SELECT 1', '-w', '-t'], {
        env: { ...process.env, ...pgEnv(conn) },
        windowsHide: true,
      });
      let stderr = '';
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('error', (e) => reject(e));
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `psql exited with code ${code}`));
      });
    });
    return { ok: true, message: `${conn.host}:${conn.port}/${conn.database} 연결 성공` };
  } catch (e) {
    const msg = (e as Error).message.split('\n')[0] || '연결 실패';
    return { ok: false, message: msg };
  }
}

export async function pgDump(conn: DBConn, outFile: string, onProgress?: (chunk: string) => void): Promise<void> {
  await runCmd({
    bin: 'pg_dump',
    args: ['-Fc', '-w', '--no-owner', '--no-acl'],
    env: pgEnv(conn),
    stdoutFile: outFile,
    onStderr: onProgress,
  });
}

export async function pgRestore(conn: DBConn, dumpFile: string, onProgress?: (chunk: string) => void): Promise<void> {
  await runCmd({
    bin: 'pg_restore',
    args: ['-d', conn.database, '-w', '--clean', '--if-exists', '--no-owner', '--no-acl', dumpFile],
    env: pgEnv(conn),
    onStderr: onProgress,
  });
}
