#!/usr/bin/env node
const { Command } = require("commander");
const chalk = require("chalk");
const { enqueueJob, listJobs } = require("./jobManager");
const { startWorkers } = require("./worker");
const { listDLQJobs, retryDLQJob } = require("./dlq");
const { setConfig, getConfig } = require("./config");

const program = new Command();

program
  .name("queuectl")
  .description("CLI-based background job queue system")
  .version("1.0.0");

// ENQUEUE
program
  .command("enqueue <command>")
  .description("Add a new job to the queue")
  .option("-r, --retries <num>", "Maximum retries", "3")
  .option("-p, --priority <num>", "Job priority (higher runs first)", "0")
  .option(
    "--run-at <isoTime>",
    "Schedule job to run at a specific ISO timestamp"
  )
  .action(async (command, options) => {
    try {
      const maxRetries = parseInt(options.retries);
      const priority = parseInt(options.priority);
      const runAt = options.runAt
        ? new Date(options.runAt).toISOString()
        : new Date().toISOString();

      const job = await enqueueJob(command, maxRetries, runAt, priority);
      console.log(chalk.green(`✅ Job enqueued successfully:`));
      console.table(job);
    } catch (err) {
      console.error(chalk.red(`❌ Failed to enqueue job:`), err.message);
    }
  });

// LIST
program
  .command("list")
  .description("List all jobs, optionally filtered by state")
  .option(
    "-s, --state <state>",
    "Filter by job state (pending, processing, completed, failed, dead)"
  )
  .action(async (options) => {
    try {
      const jobs = await listJobs(options.state);
      if (jobs.length === 0) {
        console.log(chalk.yellow("⚠️  No jobs found."));
        return;
      }
      console.table(
        jobs.map((j) => ({
          id: j.id,
          command: j.command,
          state: j.state,
          attempts: j.attempts,
          max_retries: j.max_retries,
          priority: j.priority,
          run_at: j.run_at,
          created_at: j.created_at,
        }))
      );
    } catch (err) {
      console.error(chalk.red("❌ Failed to list jobs:"), err.message);
    }
  });

// WORKER
const workerCmd = program.command("worker").description("Manage job workers");

workerCmd
  .command("start")
  .description("Start one or more workers")
  .option("--count <n>", "Number of workers", "1")
  .action(async (options) => {
    const count = parseInt(options.count);
    await startWorkers(count);
  });

workerCmd
  .command("stop")
  .description("Stop all running workers (placeholder for future use)")
  .action(() => {
    console.log("Graceful worker stop not yet implemented.");
  });

// DLQ
const dlqCmd = program
  .command("dlq")
  .description("Manage Dead Letter Queue jobs");

dlqCmd
  .command("list")
  .description("List all jobs in the Dead Letter Queue")
  .action(async () => {
    try {
      const jobs = await listDLQJobs();
      if (jobs.length === 0) {
        console.log(chalk.yellow("✅ DLQ is empty — no dead jobs!"));
        return;
      }
      console.table(
        jobs.map((j) => ({
          id: j.id,
          command: j.command,
          attempts: j.attempts,
          created_at: j.created_at,
          updated_at: j.updated_at,
        }))
      );
    } catch (err) {
      console.error(chalk.red("❌ Failed to list DLQ jobs:"), err.message);
    }
  });

dlqCmd
  .command("retry <jobId>")
  .description("Retry a failed DLQ job (move back to pending)")
  .action(async (jobId) => {
    try {
      await retryDLQJob(jobId);
      console.log(chalk.green(`🔁 Job ${jobId} moved back to pending queue!`));
    } catch (err) {
      console.error(chalk.red("❌ Failed to retry job:"), err.message);
    }
  });

// CONFIG
const configCmd = program
  .command("config")
  .description("Manage queue configuration");

configCmd
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action(async (key, value) => {
    try {
      await setConfig(key, value);
      console.log(`⚙️  Config updated: ${key} = ${value}`);
    } catch (err) {
      console.error("❌ Failed to update config:", err.message);
    }
  });

configCmd
  .command("get [key]")
  .description("Get configuration value(s)")
  .action(async (key) => {
    try {
      const data = await getConfig(key);
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log("No config found.");
        return;
      }
      if (Array.isArray(data)) {
        console.table(data);
      } else {
        console.table([data]);
      }
    } catch (err) {
      console.error("❌ Failed to get config:", err.message);
    }
  });

// LOGS
program
  .command("logs <jobId>")
  .description("Show logs (stdout & stderr) for a specific job")
  .action((jobId) => {
    const db = require("./db");
    db.all(
      `SELECT * FROM job_logs WHERE job_id = ? ORDER BY id DESC LIMIT 1`,
      [jobId],
      (err, rows) => {
        if (err) {
          console.error("❌ Error fetching logs:", err);
        } else if (rows.length === 0) {
          console.log("ℹ️  No logs found for that job.");
        } else {
          const log = rows[0];
          console.log(`\n🪵 Logs for job ${jobId}`);
          console.log("──────────────────────────────");
          console.log(chalk.green("STDOUT:"));
          console.log(log.stdout || chalk.gray("(no output)"));
          console.log(chalk.red("\nSTDERR:"));
          console.log(log.stderr || chalk.gray("(no errors)"));
          console.log("\n──────────────────────────────");
        }
      }
    );
  });

program.parse(process.argv);
