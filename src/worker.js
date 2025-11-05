//src/worker.js
const db = require("./db");
const { updateJobState, getNextPendingJob } = require("./jobManager");
const { exec } = require("child_process");
const chalk = require("chalk");
const { getConfig } = require("./config");

async function processJob(workerId) {
  const job = await getNextPendingJob();

  if (!job) {
    console.log(chalk.gray(`[Worker ${workerId}] No pending jobs, waiting...`));
    return;
  }

  console.log(
    chalk.blue(`[Worker ${workerId}] Processing job ${job.id} (${job.command})`)
  );

  await updateJobState(job.id, "processing");

  try {
    const cfgBase = await getConfig("backoff-base");
    const cfgRetries = await getConfig("max-retries");
    const cfgTimeout = await getConfig("job-timeout");

    const base = cfgBase?.value ? parseInt(cfgBase.value) : 2;
    const maxRetries = cfgRetries?.value
      ? parseInt(cfgRetries.value)
      : job.max_retries;
    const timeout = cfgTimeout?.value
      ? parseInt(cfgTimeout.value) * 1000
      : 30000;

    console.log(
      chalk.gray(
        `[Worker ${workerId}] ⏱️ Running with timeout = ${timeout / 1000}s`
      )
    );

    let stdout = "";
    let stderr = "";

    const child = exec(job.command, { timeout });

    child.stdout.on("data", (data) => (stdout += data));
    child.stderr.on("data", (data) => (stderr += data));

    await new Promise((resolve) => {
      child.on("close", async (code, signal) => {
        db.run(
          `INSERT INTO job_logs (job_id, stdout, stderr, created_at)
           VALUES (?, ?, ?, ?)`,
          [job.id, stdout, stderr, new Date().toISOString()]
        );

        if (signal === "SIGTERM" || signal === "SIGKILL") {
          console.log(
            chalk.red(
              `[Worker ${workerId}] Job ${job.id} timed out after ${
                timeout / 1000
              }s ❌`
            )
          );
          const newAttempts = job.attempts + 1;
          await handleFailure(workerId, job, newAttempts, base, maxRetries);
          resolve();
        } else if (code === 0) {
          await updateJobState(job.id, "completed");
          console.log(
            chalk.green(`[Worker ${workerId}] Job ${job.id} completed ✅`)
          );
          resolve();
        } else {
          console.log(
            chalk.red(`[Worker ${workerId}] Job ${job.id} failed ❌`)
          );
          const newAttempts = job.attempts + 1;
          await handleFailure(workerId, job, newAttempts, base, maxRetries);
          resolve();
        }
      });
    });
  } catch (err) {
    console.log(chalk.red(`[Worker ${workerId}] Unexpected error: ${err}`));
  }
}

async function handleFailure(workerId, job, newAttempts, base, maxRetries) {
  const delay = Math.pow(base, newAttempts) * 1000;

  if (newAttempts < maxRetries) {
    console.log(
      chalk.yellow(`[Worker ${workerId}] Retrying in ${delay / 1000}s...`)
    );

    db.run(
      `UPDATE jobs SET state = 'pending', attempts = ?, updated_at = ? WHERE id = ?`,
      [newAttempts, new Date().toISOString(), job.id]
    );

    await new Promise((r) => setTimeout(r, delay));
  } else {
    console.log(
      chalk.magenta(`[Worker ${workerId}] Job ${job.id} moved to DLQ ☠️`)
    );
    db.run(
      `UPDATE jobs SET state = 'dead', attempts = ?, updated_at = ? WHERE id = ?`,
      [newAttempts, new Date().toISOString(), job.id]
    );
  }
}

async function startWorkers(count = 1) {
  console.log(chalk.cyan(`🚀 Starting ${count} worker(s)...`));

  const interval = setInterval(async () => {
    const workers = [];
    for (let i = 1; i <= count; i++) {
      workers.push(processJob(i));
    }
    await Promise.all(workers);
  }, 5000);

  process.on("SIGINT", () => {
    console.log(chalk.red("\n🛑 Stopping workers gracefully..."));
    clearInterval(interval);
    process.exit(0);
  });
}

module.exports = { startWorkers };
