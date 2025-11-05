const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "..", "queue.db");

if (!fs.existsSync(DB_PATH)) {
  fs.closeSync(fs.openSync(DB_PATH, "w"));
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      state TEXT CHECK(state IN ('pending','processing','completed','failed','dead')) DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      run_at TEXT,
      priority INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS job_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      stdout TEXT,
      stderr TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(job_id) REFERENCES jobs(id)
    )
  `);
});

db.serialize(() => {
  db.get("PRAGMA table_info(jobs);", (err, info) => {
    if (err) return;
  });

  db.run("ALTER TABLE jobs ADD COLUMN priority INTEGER DEFAULT 0", (err) => {
    if (!err) {
      console.log("⚙️  Added missing 'priority' column to jobs table");
    }
  });
});

module.exports = db;
