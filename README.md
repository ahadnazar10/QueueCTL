# 🧰 QueueCTL — Job Queue & Worker System (Node.js + SQLite)

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
git clone <your-repo-url>
cd queuectl
npm install
