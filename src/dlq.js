//src/dlq.js
const db = require("./db");
const chalk = require("chalk");

function listDLQJobs() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM jobs WHERE state = 'dead' ORDER BY updated_at DESC`,
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function retryDLQJob(jobId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE jobs
       SET state = 'pending', attempts = 0, updated_at = ?
       WHERE id = ? AND state = 'dead'`,
      [new Date().toISOString(), jobId],
      function (err) {
        if (err) return reject(err);
        if (this.changes === 0)
          return reject(new Error(`No DLQ job found with id ${jobId}`));
        resolve();
      }
    );
  });
}

module.exports = { listDLQJobs, retryDLQJob };
