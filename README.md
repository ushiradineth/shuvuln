# shuvuln

shuvuln is an authorised bug bounty research harness. It ranks public bug bounty programs by
expected payout, reviews the source of the best ones, proves what it finds inside an isolated lab,
and hands you reports you can reproduce with one command and submit yourself.

Status: plan and Phase 0 (repository, toolchain, model gateway). Nothing hunts yet. The design, the
facts it rests on and each phase's exit check are in [docs/PLAN.md](docs/PLAN.md).

## What it stands on

- Authorised targets only. Each program is a file that Shu approves before any work starts.
- No model-controlled process holds a credential and a network at the same time.
- Target code runs only in Docker on an internal network.
- The harness drafts. A person reproduces each proof and submits by hand.

See [SECURITY.md](SECURITY.md) for the authorised-use terms and
[docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) for the isolation design.

## Requirements

Nix with flakes. Docker from Phase 4 on.

## Start

```sh
nix develop       # Node, pnpm, OpenHack 2.0.0 and shuvuln's own Pi
just install      # once: the TypeScript dev dependencies
just auth-login   # opens shuvuln's own Pi: /login for z.ai and OpenAI, then /exit
just auth-status  # both providers should print ready
just ping         # one tiny model call through the gateway
```

Before the login, `just auth-status` prints `not_ready` for both providers and `just ping` fails
with Pi's own hint. That is the expected starting state.

shuvuln's Pi is separate from any other Pi on the machine. It is another binary with its own agent
directory, `$SHUVULN_HOME/pi-agent` (`~/.local/share/shuvuln/pi-agent` by default), which holds the
two logins and nothing else. shuvuln never calls a model API itself and never reads the system Pi's
credentials.

## Commands

| Command             | Does                                                           |
| ------------------- | -------------------------------------------------------------- |
| `just fmt`          | Format every file the tree covers                              |
| `just check`        | `nix flake check`: hooks, types, unit tests, package builds    |
| `just typecheck`    | `tsc --noEmit` inside the shell                                |
| `just test`         | Unit tests inside the shell                                    |
| `just ping model=…` | Send one prompt through a chosen model, written provider/model |

## Layout

`parts/` holds the flake modules, `pkgs/` the two pinned packages, `src/gateway/` the model gateway
and `src/commands/` the commands behind `src/cli.ts`. Run data never enters the repository: it lives
under `$SHUVULN_HOME`.

## Licence

Apache-2.0. [NOTICE](NOTICE) lists what shuvuln builds on.
