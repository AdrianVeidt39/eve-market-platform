import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

type MigrationRow = RowDataPacket & { version: string };

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: true
  });
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(currentDir, 'migrations');

  try {
    await connection.beginTransaction();
    await connection.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB'
    );

    const [appliedRows] = await connection.query<MigrationRow[]>(
      'SELECT version FROM schema_migrations'
    );
    const applied = new Set(appliedRows.map((row) => row.version));

    const migrationFiles = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of migrationFiles) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.execute('INSERT INTO schema_migrations(version) VALUES (?)', [file]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
