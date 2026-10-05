# @runhooks/cli

Command-line interface for [Runhooks](https://runhooks.app) — reliable HTTP scheduling infrastructure.

Schedule webhooks in seconds. Never lose a webhook again.

Works on **macOS**, **Linux**, and **Windows** (cmd.exe, PowerShell, Git Bash, WSL).

---

## Table of Contents

- [Installation](#installation)
- [Quick Start (30 seconds)](#quick-start-30-seconds)
- [Account Commands](#account-commands)
- [Job Commands](#job-commands)
- [Execution Commands](#execution-commands)
- [Alert Commands](#alert-commands)
- [Template Commands](#template-commands)
- [Usage & Plan](#usage--plan)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Cross-Platform Notes](#cross-platform-notes)
- [Exit Codes](#exit-codes)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Installation

### Requirements

- Node.js **20 or newer** (`node --version` to check)
- A package manager: `npm`, `pnpm`, or `yarn`

### Install globally

Using **npm**:

```bash
npm install -g @runhooks/cli
```

Using **pnpm**:

```bash
pnpm add -g @runhooks/cli
```

Using **yarn**:

```bash
yarn global add @runhooks/cli
```

After installation, the `runhooks` command should be available everywhere.

```bash
runhooks --version
```

### Run without installing

```bash
npx @runhooks/cli <command>
```

### Verifying the install on Windows

If `runhooks` is not recognized after a global install on Windows, the npm global bin directory is probably not on your `PATH`. Find it with:

```cmd
npm config get prefix
```

Then add that directory (for npm, usually `%APPDATA%\npm`) to your **User PATH** via *System Properties → Environment Variables*, and open a new terminal.

### Verifying the install on macOS / Linux

Make sure your shell can find globally-installed npm binaries. They're usually in `/usr/local/bin` (system Node) or `~/.npm-global/bin` (user-scoped). If not found:

```bash
echo $PATH
npm config get prefix
```

Add `<prefix>/bin` to your `PATH` in `~/.zshrc`, `~/.bashrc`, or `~/.profile` and restart your terminal.

---

## Quick Start (30 seconds)

The fastest path from zero to a running scheduled job:

```bash
# 1. Create an account (no email required)
runhooks init

# 2. Schedule a webhook every 5 minutes
runhooks create -n "Sync inventory" -u https://api.example.com/sync -m POST --cron "*/5 * * * *"

# 3. Check it's running
runhooks list

# 4. View execution logs
runhooks logs <job-id>
```

That's it. Your job is live. When you're ready, secure your account:

```bash
# Add email & password (so you can log in from the dashboard too)
runhooks upgrade
```

### Already have an account?

If you registered via the web dashboard and have an API key:

```bash
runhooks login --api-key rh_live_xxxxxxxxxxxx
```

---

## Account Commands

### `runhooks init`

Create an anonymous account and save credentials locally. This is the recommended starting point — no email, no password, just start scheduling.

| Option | Description |
|---|---|
| `--name <name>` | Display name (will prompt if omitted) |

```bash
# Interactive — prompts for an optional display name
runhooks init

# Non-interactive
runhooks init --name "My Server"
```

If a config already exists, you'll be asked to confirm before overwriting.

---

### `runhooks login`

Store API credentials locally. Use this when you already have an API key (e.g. from the web dashboard or from a teammate).

| Option | Description |
|---|---|
| `--api-key <key>` | Your API key (hidden prompt if omitted) |

```bash
# Interactive — prompts for API key
runhooks login

# Non-interactive (CI-friendly)
runhooks login --api-key rh_live_xxxxxxxxxxxx
```

The CLI validates the credentials against the API before saving.

---

### `runhooks logout`

Remove stored credentials.

```bash
runhooks logout
```

---

### `runhooks whoami`

Show your current account details and verify the connection.

```bash
runhooks whoami
```

Output:

```
API URL:  https://api.runhooks.app
API Key:  rh_abc1…ef90
Name:     Ronen
Email:    (anonymous)
Plan:     free
Account:  anonymous

Tip: Run `runhooks upgrade` to add email/password.
```

---

### `runhooks upgrade`

Add email and password to an anonymous account. This lets you log in from the web dashboard and protects your account if you lose your API key.

```bash
runhooks upgrade
```

Two upgrade paths are offered:

1. **Inline** (default) — enter email and password directly in the terminal.
2. **Browser link** — get a one-time URL to complete the upgrade in the web dashboard.

If your account already has an email, this command exits cleanly with a message.

---

### `runhooks rotate-key`

Generate a new API key. The old key stops working immediately.

| Option | Short | Description |
|---|---|---|
| `--force` | `-f` | Skip confirmation prompt |

```bash
# With confirmation prompt
runhooks rotate-key

# Non-interactive
runhooks rotate-key -f
```

The new key is saved to your config automatically.

---

## Job Commands

### `runhooks create`

Create a new scheduled job. You **must** provide either `--cron` or `--interval` (not both).

| Option | Short | Description | Default |
|---|---|---|---|
| `--name <name>` | `-n` | **(required)** Job name | — |
| `--url <url>` | `-u` | **(required)** Target URL to hit on each run | — |
| `--description <text>` | `-d` | Optional human-readable description | — |
| `--method <method>` | `-m` | HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) | `GET` |
| `--header <header>` | `-H` | HTTP header in `"Key: Value"` form. Repeatable. | — |
| `--body <body>` | `-b` | Request body (string) | — |
| `--timeout <duration>` | `-t` | Request timeout (e.g. `30s`, `60s`, `5m`) | `30s` |
| `--cron <expression>` | | Cron expression (e.g. `"*/5 * * * *"`) | — |
| `--interval <duration>` | | Interval duration (e.g. `30s`, `5m`, `1h`, `2d`) | — |
| `--timezone <tz>` | | IANA timezone (only for cron schedules, e.g. `America/New_York`) | — |
| `--tag <tag>` | | Tag to attach. Repeatable. | — |
| `--max-retries <n>` | | Max retry attempts on failure | `3` |
| `--initial-delay <duration>` | | Initial retry delay | `1s` |
| `--json` | | Output the created job as JSON | — |

```bash
# Cron-scheduled POST with auth header
runhooks create -n "Refresh cache" \
  -u https://api.example.com/refresh \
  -m POST \
  -H "Authorization: Bearer xyz" \
  --cron "0 * * * *" \
  --timezone "America/New_York"

# Interval-scheduled GET with tags
runhooks create -n "Healthcheck" -u https://api.example.com/health --interval 30s --tag prod --tag healthcheck

# Output as JSON for piping
runhooks create -n "Test job" -u https://example.com --interval 1m --json
```

**Duration format**: `<number><unit>` where unit is one of `ms`, `s`, `m`, `h`, `d`. A bare integer is interpreted as milliseconds.

---

### `runhooks list` (alias: `ls`)

List your jobs.

| Option | Short | Description |
|---|---|---|
| `--status <status>` | `-s` | Filter by status: `active`, `paused`, `completed`, `failed` |
| `--tag <tag>` | `-t` | Filter by tag |
| `--name <name>` | `-n` | Filter by name (regex) |
| `--page <n>` | | Page number |
| `--limit <n>` | | Results per page |
| `--json` | | Output as JSON |

```bash
runhooks list
runhooks ls --status active
runhooks ls --tag prod --limit 50
```

---

### `runhooks get <id>`

Show details of one job.

| Option | Description |
|---|---|
| `--json` | Output as JSON |

```bash
runhooks get 65f8a1b2c3d4e5f6a7b8c9d0
```

---

### `runhooks update <id>`

Update an existing job. Only the flags you provide are changed — everything else stays the same.

| Option | Short | Description |
|---|---|---|
| `--name <name>` | `-n` | Job name |
| `--description <text>` | `-d` | Job description |
| `--url <url>` | `-u` | Target URL |
| `--method <method>` | `-m` | HTTP method |
| `--header <header>` | `-H` | HTTP header in `"Key: Value"` form. Repeatable. |
| `--body <body>` | `-b` | Request body |
| `--timeout <duration>` | `-t` | Request timeout |
| `--cron <expression>` | | Cron expression |
| `--interval <duration>` | | Interval duration |
| `--timezone <tz>` | | IANA timezone |
| `--tag <tag>` | | Tags (replaces all existing tags) |
| `--max-retries <n>` | | Max retry attempts |
| `--initial-delay <duration>` | | Initial retry delay |
| `--status <status>` | | Set status (`active` or `paused`) |
| `--json` | | Output as JSON |

```bash
# Rename a job
runhooks update 65f8a1b2c3d4e5f6a7b8c9d0 -n "New name"

# Change schedule and URL
runhooks update 65f8a1b2c3d4e5f6a7b8c9d0 --cron "0 */2 * * *" -u https://new-url.example.com

# Pause via update (same as `runhooks pause`)
runhooks update 65f8a1b2c3d4e5f6a7b8c9d0 --status paused
```

---

### `runhooks pause <id>`

Pause a job. The job stops executing until resumed.

```bash
runhooks pause 65f8a1b2c3d4e5f6a7b8c9d0
```

---

### `runhooks resume <id>`

Resume a paused job.

```bash
runhooks resume 65f8a1b2c3d4e5f6a7b8c9d0
```

---

### `runhooks delete <id>` (alias: `rm`)

Delete a job. Prompts for confirmation unless `--force` is supplied.

| Option | Short | Description |
|---|---|---|
| `--force` | `-f` | Skip the confirmation prompt |

```bash
runhooks delete 65f8a1b2c3d4e5f6a7b8c9d0
runhooks rm 65f8a1b2c3d4e5f6a7b8c9d0 -f
```

---

## Execution Commands

### `runhooks logs <job-id>`

Show recent executions for a job.

| Option | Short | Description | Default |
|---|---|---|---|
| `--limit <n>` | `-l` | Results per page | `20` |
| `--page <n>` | | Page number | `1` |
| `--status <status>` | `-s` | Filter by execution status (`success`, `failed`, `timeout`, `running`, `pending`, `dead_letter`, `quota_exceeded`) | — |
| `--json` | | Output as JSON | — |

```bash
runhooks logs 65f8a1b2c3d4e5f6a7b8c9d0
runhooks logs 65f8a1b2c3d4e5f6a7b8c9d0 --status failed --json
```

---

### `runhooks replay <execution-id>`

Re-run a past execution immediately. Useful for debugging or recovering from transient failures. The replay creates a new execution linked to the original.

```bash
runhooks replay 65f9b2c3d4e5f6a7b8c9d0e1
```

---

## Alert Commands

Alerts notify you when jobs fail. Supports email, webhook, and Slack channels.

### `runhooks alerts list`

List all your alerts.

| Option | Description |
|---|---|
| `--json` | Output as JSON |

```bash
runhooks alerts list
runhooks alerts list --json
```

---

### `runhooks alerts create`

Create a new alert.

| Option | Short | Description | Default |
|---|---|---|---|
| `--name <name>` | `-n` | **(required)** Alert name | — |
| `--channel <channel>` | `-c` | **(required)** `email`, `webhook`, or `slack` | — |
| `--target <target>` | | **(required)** Destination (email address, webhook URL, or Slack URL) | — |
| `--job-id <id>` | | Scope to a specific job (omit for all jobs) | all jobs |
| `--threshold <n>` | | Consecutive failures before alert fires | `1` |
| `--cooldown <minutes>` | | Minimum minutes between repeat alerts | `60` |
| `--disabled` | | Create in disabled state | — |
| `--json` | | Output as JSON | — |

```bash
# Email alert on any job failure
runhooks alerts create -n "All failures" -c email --target me@example.com

# Webhook alert for a specific job, after 3 consecutive failures
runhooks alerts create -n "Critical sync alert" -c webhook \
  --target https://hooks.slack.com/xxx \
  --job-id 65f8a1b2c3d4e5f6a7b8c9d0 \
  --threshold 3

# Slack alert with 30-minute cooldown
runhooks alerts create -n "Slack notify" -c slack --target https://hooks.slack.com/yyy --cooldown 30
```

---

### `runhooks alerts get <id>`

Show alert details.

| Option | Description |
|---|---|
| `--json` | Output as JSON |

```bash
runhooks alerts get 65fa1b2c3d4e5f6a7b8c9d0e
```

---

### `runhooks alerts update <id>`

Update an alert. Only the flags you provide are changed.

| Option | Short | Description |
|---|---|---|
| `--name <name>` | `-n` | Alert name |
| `--channel <channel>` | `-c` | Alert channel |
| `--target <target>` | | Destination |
| `--enable` | | Enable the alert |
| `--disable` | | Disable the alert |
| `--json` | | Output as JSON |

```bash
# Change target
runhooks alerts update 65fa1b2c3d4e5f6a7b8c9d0e --target new@example.com

# Disable an alert
runhooks alerts update 65fa1b2c3d4e5f6a7b8c9d0e --disable
```

---

### `runhooks alerts delete <id>`

Delete an alert. Prompts for confirmation unless `--force` is supplied.

| Option | Short | Description |
|---|---|---|
| `--force` | `-f` | Skip confirmation prompt |

```bash
runhooks alerts delete 65fa1b2c3d4e5f6a7b8c9d0e
runhooks alerts delete 65fa1b2c3d4e5f6a7b8c9d0e -f
```

---

## Template Commands

Templates bundle opinionated defaults (retry policy, headers, tags) for common job
shapes so you don't have to remember the right knobs every time.

### `runhooks template list`

List all bundled templates.

| Option | Description |
|---|---|
| `--json` | Output as JSON |

```bash
runhooks template list
```

### `runhooks template use <name>`

Create a job from a template. Prompts for any placeholder not supplied via `--set`.

| Option | Description |
|---|---|
| `--set KEY=VALUE` | Pre-fill a placeholder value (repeatable) |
| `--no-prompt` | Fail if any placeholder is unset (CI-friendly) |
| `--json` | Output the created job as JSON |

```bash
runhooks template use retry-webhook \
  --set TARGET_URL=https://api.example.com/hooks/retry \
  --set CRON_EXPRESSION="*/10 * * * *"
```

#### Bundled templates

| Name | What it creates |
|---|---|
| `retry-webhook` | Generic POST webhook with aggressive retries (5 attempts, exponential backoff). |
| `shopify-webhook-retry` | Replay a Shopify webhook with HMAC headers and Shopify-tuned retries. |

---

## Usage & Plan

### `runhooks usage`

Show your current plan usage and limits.

| Option | Description |
|---|---|
| `--json` | Output as JSON |

```bash
runhooks usage
```

When you hit a plan limit (e.g. max jobs or max alerts), the CLI will suggest running `runhooks upgrade` to unlock higher limits.

---

## Configuration

The CLI stores credentials in a config file at:

| OS | Path |
|---|---|
| **macOS / Linux** | `~/.runhooks/config.json` |
| **Windows** | `%USERPROFILE%\.runhooks\config.json` (typically `C:\Users\<you>\.runhooks\config.json`) |

The file is created automatically by `runhooks init` or `runhooks login`. On macOS/Linux it is `chmod 0600` (user read/write only). On Windows, file permissions follow the user's profile ACL.

The file is plain JSON:

```json
{
  "apiUrl": "https://api.runhooks.app",
  "apiKey": "rh_live_xxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

## Environment Variables

You can override the file-based config with environment variables. These take precedence when both are set, making the CLI ideal for CI/CD pipelines.

| Variable | Description |
|---|---|
| `RUNHOOKS_API_URL` | API base URL |
| `RUNHOOKS_API_KEY` | API key |
| `NO_COLOR` | Set to any value to disable ANSI color output |

### Setting env vars

**macOS / Linux** (bash/zsh):

```bash
export RUNHOOKS_API_URL="https://api.runhooks.app"
export RUNHOOKS_API_KEY="rh_live_xxxxxxxxxxxx"
runhooks list
```

**Windows (cmd.exe)**:

```cmd
set RUNHOOKS_API_URL=https://api.runhooks.app
set RUNHOOKS_API_KEY=rh_live_xxxxxxxxxxxx
runhooks list
```

**Windows (PowerShell)**:

```powershell
$env:RUNHOOKS_API_URL = "https://api.runhooks.app"
$env:RUNHOOKS_API_KEY = "rh_live_xxxxxxxxxxxx"
runhooks list
```

---

## Cross-Platform Notes

The CLI is platform-agnostic, but a few shell conventions differ.

### Quoting cron expressions

Cron expressions contain `*` which is a glob character. **Always quote them.**

| Shell | Example |
|---|---|
| bash / zsh | `--cron "*/5 * * * *"` |
| Windows cmd | `--cron "*/5 * * * *"` |
| PowerShell | `--cron "*/5 * * * *"` |

### Multi-line commands

| Shell | Line continuation |
|---|---|
| bash / zsh | trailing `\` |
| Windows cmd | trailing `^` |
| PowerShell | trailing `` ` `` (backtick) |

### JSON bodies with quotes

bash/zsh — use single quotes outside:

```bash
runhooks create -n "Webhook" -u https://example.com --interval 1m -b '{"event":"test"}'
```

Windows cmd / PowerShell — escape inner quotes with `\"`:

```cmd
runhooks create -n "Webhook" -u https://example.com --interval 1m -b "{\"event\":\"test\"}"
```

### Hidden input

When the CLI prompts for a password or API key, input is hidden. On Windows this works in cmd.exe, PowerShell, and Windows Terminal. In non-TTY environments, pass values via flags instead.

### Colors

ANSI colors are auto-disabled when:

- `NO_COLOR` environment variable is set
- stdout is not a TTY (e.g. piped to a file)

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error (invalid arguments, API error, network failure, auth failure, etc.) |
| `130` | Cancelled by user (Ctrl+C during a prompt) |

---

## Troubleshooting

**`runhooks: command not found`** — see [Verifying the install](#verifying-the-install-on-windows) above. The npm global bin directory is probably not on your `PATH`.

**`Authentication failed. Check your API key.`** — your stored key is invalid or revoked. Run `runhooks rotate-key` if you need a new one, or `runhooks logout && runhooks login` to re-enter credentials.

**`Cannot reach <url>. Is the API running?`** — the API URL is wrong or unreachable. For local development, make sure the API is running on the configured port.

**`Not configured.`** — run `runhooks init` for quick setup, or `runhooks login` with an existing API key.

**`Plan limit reached.`** — you've hit a free-tier limit. Run `runhooks upgrade` to add email/password (required for paid plans), then upgrade your plan from the web dashboard.

**Garbled symbols in Windows cmd.exe** — the legacy console can't render UTF-8 glyphs. Use **Windows Terminal** or **PowerShell 7+**, or run `chcp 65001` in your cmd session.

---

## Command Reference

Quick reference of all available commands:

```
Account
  runhooks init [--name]                     Create anonymous account
  runhooks login [--api-key]                 Store existing credentials
  runhooks logout                            Remove credentials
  runhooks whoami                            Show current account
  runhooks upgrade                           Add email/password
  runhooks rotate-key [-f]                   Rotate API key

Jobs
  runhooks create [options]                  Create a job
  runhooks list [options]                    List jobs
  runhooks get <id> [--json]                 Show job details
  runhooks update <id> [options]             Update a job
  runhooks pause <id>                        Pause a job
  runhooks resume <id>                       Resume a job
  runhooks delete <id> [-f]                  Delete a job

Executions
  runhooks logs <job-id> [options]           Show execution logs
  runhooks replay <execution-id>             Re-run an execution

Alerts
  runhooks alerts list [--json]              List alerts
  runhooks alerts create [options]           Create an alert
  runhooks alerts get <id> [--json]          Show alert details
  runhooks alerts update <id> [options]      Update an alert
  runhooks alerts delete <id> [-f]           Delete an alert

Templates
  runhooks template list [--json]            List templates
  runhooks template use <name> [options]     Create job from template

Other
  runhooks usage [--json]                    Show plan usage
```

---

## License

MIT
