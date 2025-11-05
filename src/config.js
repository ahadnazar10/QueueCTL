//src/config.js
const db = require("./db");

function initConfig() {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      [],
      (err) => {
        if (err) return reject(err);

        const defaults = [
          ["max-retries", "3"],
          ["backoff-base", "2"],
          ["job-timeout", "30"],
        ];

        const stmt = db.prepare(`
          INSERT INTO config (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO NOTHING
        `);

        defaults.forEach(([key, value]) => {
          stmt.run([key, value]);
        });

        stmt.finalize();
        resolve();
      }
    );
  });
}

function setConfig(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO config (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function getConfig(key = null) {
  return new Promise((resolve, reject) => {
    if (key) {
      db.get(`SELECT * FROM config WHERE key = ?`, [key], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    } else {
      db.all(`SELECT * FROM config`, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    }
  });
}

async function getConfigValue(key) {
  const row = await getConfig(key);
  return row ? row.value : null;
}

module.exports = {
  initConfig,
  setConfig,
  getConfig,
  getConfigValue,
};
