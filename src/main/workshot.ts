import { createWriteStream, createReadStream, statSync, mkdirSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { tmpdir } from 'os';
import * as tar from 'tar-stream';
import type { SnapshotManifest } from '@shared/types';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface PackInput {
  manifest: SnapshotManifest;
  dumpFiles: { name: string; path: string }[];
  outFile: string;
}

export async function packWorkshot(input: PackInput): Promise<{ size: number }> {
  const dir = dirname(input.outFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const pack = tar.pack();
  const gzip = createGzip({ level: 6 });
  const out = createWriteStream(input.outFile);

  const writePromise = pipeline(pack, gzip, out);

  const manifestBuf = Buffer.from(JSON.stringify(input.manifest, null, 2), 'utf8');
  await new Promise<void>((resolve, reject) => {
    pack.entry({ name: 'manifest.json', size: manifestBuf.length }, manifestBuf, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  for (const f of input.dumpFiles) {
    const size = statSync(f.path).size;
    await new Promise<void>((resolve, reject) => {
      const entry = pack.entry({ name: `dumps/${f.name}`, size }, (err) => {
        if (err) reject(err);
        else resolve();
      });
      createReadStream(f.path).pipe(entry);
    });
  }

  pack.finalize();
  await writePromise;
  return { size: statSync(input.outFile).size };
}

export interface UnpackResult {
  manifest: SnapshotManifest;
  extractDir: string;
  dumpPaths: Record<string, string>; // name -> absolute path
}

export async function unpackWorkshot(workshotPath: string): Promise<UnpackResult> {
  const extractDir = join(tmpdir(), `workshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(extractDir, { recursive: true });
  mkdirSync(join(extractDir, 'dumps'), { recursive: true });

  const extract = tar.extract();
  const dumpPaths: Record<string, string> = {};
  let manifest: SnapshotManifest | null = null;

  extract.on('entry', (header, stream, next) => {
    if (header.name === 'manifest.json') {
      const chunks: Buffer[] = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => {
        manifest = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        next();
      });
    } else if (header.name.startsWith('dumps/')) {
      const fileName = basename(header.name);
      const outPath = join(extractDir, 'dumps', fileName);
      const w = createWriteStream(outPath);
      stream.pipe(w);
      w.on('finish', () => {
        dumpPaths[fileName] = outPath;
        next();
      });
    } else {
      stream.on('end', () => next());
      stream.resume();
    }
  });

  await pipeline(createReadStream(workshotPath), createGunzip(), extract);
  if (!manifest) throw new Error('manifest.json이 없습니다 — 잘못된 .workshot 파일');
  return { manifest, extractDir, dumpPaths };
}

export async function readManifestOnly(workshotPath: string): Promise<SnapshotManifest> {
  const extract = tar.extract();
  let manifest: SnapshotManifest | null = null;

  extract.on('entry', (header, stream, next) => {
    if (header.name === 'manifest.json') {
      const chunks: Buffer[] = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => {
        try {
          manifest = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          next();
        } catch (e) {
          next(e as Error);
        }
      });
    } else {
      stream.on('end', () => next());
      stream.resume();
    }
  });

  await pipeline(createReadStream(workshotPath), createGunzip(), extract);
  if (!manifest) throw new Error('manifest.json이 없습니다 — 잘못된 .workshot 파일');
  return manifest;
}
