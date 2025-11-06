# QueueCTL — Job Queue & Worker System (Node.js + SQLite)

**QueueCTL** is a lightweight, CLI-driven job queue system built with **Node.js** and **SQLite**.  
It supports delayed execution, retries with backoff, dead-letter queues, priorities, logging, and more — all managed with a single CLI tool.

---

## 🚀 Features

| Feature | Description |
|----------|-------------|
| 🧩 **Persistent SQLite storage** | All jobs, logs, and config values are persisted in `queue.db`. |
| 🔁 **Retry logic with exponential backoff** | Jobs automatically retry after failure using configurable retry/backoff settings. |
| ⏱️ **Job timeout handling** | Each job automatically terminates if it exceeds a configured timeout duration. |
| ☠️ **Dead Letter Queue (DLQ)** | Jobs that fail repeatedly are moved to a DLQ for inspection. |
| ⏰ **Scheduled / Delayed jobs** | Jobs can be scheduled to run at a specific UTC timestamp using `--run-at`. |
| 🎯 **Priority queueing** | Higher priority jobs run before lower ones. |
| 🪵 **Job output logging** | Captures `stdout` and `stderr` of every executed job. |
| ⚙️ **Configurable settings** | Settings like `max-retries`, `job-timeout`, `backoff-base` are configurable. |
| 🧠 **Graceful worker shutdown** | Workers finish current jobs and exit cleanly on `SIGINT`. |
| 🧪 **End-to-End testing** | Includes a test harness (`test.js`) that validates all features automatically. |

---

## 🛠️ Installation

```bash
git clone https://github.com/ahadnazar10/QueueCTL.git
cd QueueCTL
npm install
```
## ⚙️ Database Setup

Initialize (or update) your local SQLite database:
```bash
node src/db.js
```
💡 If queue.db doesn’t exist, it will be created automatically when you run node test.js or any queuectl command.

## 🧑‍💻 CLI Usage
Enqueue a Job
```bash
queuectl enqueue "echo 'Hello QueueCTL!'"
```

Schedule a Job
```bash
queuectl enqueue "echo 'This runs later!'" --run-at "2025-11-05T08:00:00Z"
```

Job with Priority
```bash
queuectl enqueue "echo 'High priority!'" --priority 5
queuectl enqueue "echo 'Low priority!'" --priority 1
```

Start Worker(s)
```bash
queuectl worker start --count 2
```
List Jobs
```bash
queuectl list
```

View Dead Letter Queue
```bash
queuectl dlq list
```

View Logs for a Job
```bash
queuectl logs <job-id>
```

## ⚙️ Configuration

Use config commands to customize behavior:
```bash
queuectl config set max-retries 3
queuectl config set backoff-base 2
queuectl config set job-timeout 3
queuectl config get
```

## 🧪 End-to-End Test

Run all features automatically:
```bash
node test.js
```
This script:

-Sets up configuration

-Enqueues normal, delayed, failed, and timeout jobs

-Starts a worker

-Waits 40s

-Displays final job and DLQ summaries

## Author

Developed by Ahad

A complete Node.js + SQLite job queue system with retry logic, delays, priorities, and logging.
