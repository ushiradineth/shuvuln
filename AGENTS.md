# shuvuln

Authorised bug bounty research harness. The plan, the facts it rests on and each phase's exit check
are in [docs/PLAN.md](docs/PLAN.md).

## Commands

Run everything inside `nix develop`, which puts the tools on `PATH` and sets `SHUVULN_PI` and
`SHUVULN_HOME`.

- Format: `just fmt` (`nix fmt`)
- All checks: `just check` (`nix flake check`: hooks, `tsc --noEmit`, `node --test`, package builds)
- Types only: `just typecheck`. Unit tests only: `just test`
- Dev dependencies, once: `just install` (pnpm)
- Provider readiness: `just auth-status`. Login: `just auth-login`
- Gateway smoke test: `just ping model=zai/glm-5.4`, or any `provider/model`
- Packages: `nix build .#openhack`, `.#pi`, `.#shuvuln`

## Verified

2026-11-24, aarch64-darwin:

- `nix flake check` passes. The Linux systems are not checked from this machine.
- `openhack` 2.0.0 and the bundled `pi` 1.6.0 run from `nix build`.
- Before any login, `just auth-status` reports `not_ready` for both providers, and `just ping` fails
  with exit status 1 and Pi's own hint.
- A successful `just ping` is not verified yet. It needs the two logins.

## Structure

- `parts/`: flake-parts modules. `packages.nix` builds the packages. `development.nix` holds the dev
  shell, formatter, hooks and checks.
- `pkgs/`: `openhack.nix` is the MIT release archive, hash verified. `pi.nix` is Pi from
  `llm-agents.nix` with its own agent directory.
- `src/gateway/`: the model gateway. `args.ts` builds the Pi command line, `environment.ts` the
  child environment, `events.ts` the event-stream reader and `run.ts` the runner.
- `src/commands/`: the commands behind `src/cli.ts`.
- Run data lives in `$SHUVULN_HOME` (default `~/.local/share/shuvuln`), never in the repository.

## Conventions

- TypeScript run through Node's type stripping: erasable syntax only, explicit `.ts` import
  specifiers, tests with `node:test`. No runtime dependency without a decision in the plan.
- Nix formatting by alejandra. Everything else by prettier (no semicolons, double quotes, width
  100). typos and gitleaks run on every commit.
- Docs and comments state what is verified and what is not.

## Boundaries

- Authorised targets only, each approved in its own program file before work starts. See
  [SECURITY.md](SECURITY.md).
- No request to a program asset. Target code runs only in Docker on an internal network.
- Model calls go only through shuvuln's own Pi. Never read or copy the system Pi's credentials.
- No credentials in code, prompts, containers, logs or commits.
- Commit, publish, deploy and any apply happen only on Shu's word. Do not bypass hooks.
