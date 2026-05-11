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

function getTargetDatabase(conn: DBConn): string {
  const database = conn.database.trim();
  if (!database) throw new Error('복원할 DB 이름이 비어 있습니다');

  const blocked = new Set(['postgres', 'template0', 'template1']);
  if (blocked.has(database.toLowerCase())) {
    throw new Error(`시스템 DB는 복원 대상으로 사용할 수 없습니다: ${database}`);
  }

  return database;
}

function quotePgIdentifier(value: string): string {
  if (value.includes('\0')) throw new Error('DB 이름에 사용할 수 없는 문자가 포함되어 있습니다');
  return `"${value.replace(/"/g, '""')}"`;
}

function quotePgLiteral(value: string): string {
  if (value.includes('\0')) throw new Error('DB 이름에 사용할 수 없는 문자가 포함되어 있습니다');
  return `'${value.replace(/'/g, "''")}'`;
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

async function recreateDatabase(conn: DBConn, onProgress?: (chunk: string) => void): Promise<string> {
  const database = getTargetDatabase(conn);
  const databaseIdentifier = quotePgIdentifier(database);
  const databaseLiteral = quotePgLiteral(database);
  const maintenanceDatabases = ['postgres', 'template1'];
  let lastError: Error | null = null;

  for (const maintenanceDatabase of maintenanceDatabases) {
    try {
      await runCmd({
        bin: 'psql',
        args: [
          '-d',
          maintenanceDatabase,
          '-w',
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${databaseLiteral} AND pid <> pg_backend_pid();`,
          '-c',
          `DROP DATABASE IF EXISTS ${databaseIdentifier};`,
          '-c',
          `CREATE DATABASE ${databaseIdentifier} WITH TEMPLATE template0;`,
        ],
        env: pgEnv(conn, { PGDATABASE: maintenanceDatabase }),
        onStderr: onProgress,
      });
      return database;
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw new Error(
    `DB 재생성 실패 (${database}). 대상 DB를 삭제/생성할 권한이 필요합니다. ${lastError?.message ?? ''}`.trim(),
  );
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
  const database = await recreateDatabase(conn, onProgress);
  await runCmd({
    bin: 'pg_restore',
    args: ['-d', database, '-w', '--no-owner', '--no-acl', '--single-transaction', dumpFile],
    env: pgEnv({ ...conn, database }),
    onStderr: onProgress,
  });
}
