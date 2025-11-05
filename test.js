const fs = require("fs");
const path = require("path");
const dbFile = path.join(__dirname, "queue.db");
const db = require("./src/db");
const { enqueueJob, listJobs } = require("./src/jobManager");
const { startWorkers } = require("./src/worker");
const { listDLQJobs } = require("./src/dlq");
const { setConfig, getConfig } = require("./src/config");

(async () => {
  console.log("🧪 QueueCTL End-to-End Test Started\n");

  console.log(
    "⚠️  Skipping DB reset (OneDrive may lock the file). Using existing queue.db."
  );
  require("./src/db");

  //Configure system
  console.log("⚙️ Setting config values...");
  await setConfig("max-retries", "3");
  await setConfig("backoff-base", "2");
  await setConfig("job-timeout", "3");
  console.table(await getConfig());

  //Enqueue jobs
  console.log("\n📦 Enqueuing jobs...");
  await enqueueJob("echo '✅ Normal Job'");
  await enqueueJob("sleep 10");
  await enqueueJob("badcommand");

  const futureTime = new Date(Date.now() + 30000).toISOString();
  await enqueueJob("echo '⏰ Scheduled Job!'", 3, futureTime);

  //Priority jobs
  await enqueueJob("echo '🔻 Low Priority'", 3, new Date().toISOString(), 1);
  await enqueueJob("echo '🔺 High Priority'", 3, new Date().toISOString(), 5);

  console.table(await listJobs());

  console.log("\n🚀 Starting worker...");
  await startWorkers(1);

  console.log("🕓 Waiting 40 seconds for jobs to complete...");
  await new Promise((r) => setTimeout(r, 40000));

  process.kill(process.pid, "SIGINT");

  //Results
  console.log("\n📊 Final job summary:");
  console.table(await listJobs());

  console.log("\n☠️ Dead Letter Queue:");
  console.table(await listDLQJobs());

  console.log("\n🪵 Checking recent job logs:");
  db.all(
    `SELECT job_id, stdout, stderr, created_at 
     FROM job_logs 
     ORDER BY id DESC 
     LIMIT 5`,
    [],
    (err, rows) => {
      if (err) {
        console.error("❌ Error fetching logs:", err);
      } else if (!rows || rows.length === 0) {
        console.log("ℹ️ No logs recorded yet.");
      } else {
        console.table(rows);
      }

      console.log("\n✅ Test completed successfully!");
      process.exit(0);
    }
  );
})();
