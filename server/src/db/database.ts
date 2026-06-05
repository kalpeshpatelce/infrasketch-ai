import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface Generation {
  id: string;
  description: string;
  outputType: string;
  provider: string;
  terraform: string | null;
  ansible: string | null;
  architecture: string | null;
  createdAt: string;
}

let db: Database.Database;

export function initDatabase(): void {
  const dbPath = process.env.DB_PATH || "./data/infrasketch.db";
  const dbDir = path.dirname(dbPath);

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      output_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      terraform TEXT,
      ansible TEXT,
      architecture TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Migration: add architecture column if it doesn't exist
  try {
    db.exec(`ALTER TABLE generations ADD COLUMN architecture TEXT`);
  } catch {
    // Column already exists, ignore
  }

  console.log("Database initialized at:", dbPath);
}

export function saveGeneration(generation: Generation): void {
  const stmt = db.prepare(`
    INSERT INTO generations (id, description, output_type, provider, terraform, ansible, architecture, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    generation.id,
    generation.description,
    generation.outputType,
    generation.provider,
    generation.terraform,
    generation.ansible,
    generation.architecture,
    generation.createdAt
  );
}

export function getGenerations(): Generation[] {
  const rows = db
    .prepare(
      "SELECT id, description, output_type, provider, created_at FROM generations ORDER BY created_at DESC LIMIT 50"
    )
    .all() as any[];

  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    outputType: row.output_type,
    provider: row.provider,
    terraform: null,
    ansible: null,
    architecture: null,
    createdAt: row.created_at,
  }));
}

export function getGenerationById(id: string): Generation | null {
  const row = db
    .prepare("SELECT * FROM generations WHERE id = ?")
    .get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    description: row.description,
    outputType: row.output_type,
    provider: row.provider,
    terraform: row.terraform,
    ansible: row.ansible,
    architecture: row.architecture,
    createdAt: row.created_at,
  };
}

export function deleteGeneration(id: string): void {
  db.prepare("DELETE FROM generations WHERE id = ?").run(id);
}
