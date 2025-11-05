const db = require("./db");
const { v4: uuidv4 } = require("uuid");

function enqueueJob(
  command,
  maxRetries = 3,
  runAt = new Date().toISOString(),
  priority = 0
) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    db.run(
      `INSERT INTO jobs (id, command, state, attempts, max_retries, run_at, priority, created_at, updated_at)
       VALUES (?, ?, 'pending', 0, ?, ?, ?, ?, ?)`,
      [id, command, maxRetries, runAt, priority, createdAt, updatedAt],
      function (err) {
        if (err) return reject(err);
        resolve({
          id,
          command,
          state: "pending",
          max_retries: maxRetries,
          run_at: runAt,
          priority,
          createdAt,
        });
      }
    );
  });
}

function listJobs(state = null) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM jobs";
    const params = [];

    if (state) {
      query += " WHERE state = ?";
      params.push(state);
    }

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function updateJobState(id, state) {
  return new Promise((resolve, reject) => {
    const updatedAt = new Date().toISOString();
    db.run(
      `UPDATE jobs SET state = ?, updated_at = ? WHERE id = ?`,
      [state, updatedAt, id],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function getNextPendingJob() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM jobs
       WHERE state = 'pending'
       AND datetime(run_at) <= datetime('now')
       ORDER BY priority DESC, created_at ASC
       LIMIT 1`,
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

module.exports = {
  enqueueJob,
  listJobs,
  updateJobState,
  getNextPendingJob,
};
