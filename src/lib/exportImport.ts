import { exportDB, importInto } from 'dexie-export-import';
import { db } from './db';

export async function exportDatabase(): Promise<void> {
  const blob = await exportDB(db);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notebench-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importDatabase(file: File): Promise<void> {
  await importInto(db, file, { clearTablesBeforeImport: true, overwriteValues: true });
  window.location.reload();
}
