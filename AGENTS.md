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
- Gateway smoke test: `just ping`, or `just ping model=<provider/model>`
- Discovery engine smoke test: `just smoke` (OpenHack on `fixtures/notes-app`, costs plan usage)
- Store a token: `just secret-set hexbrain`. List: `just secrets`
- After a scan: `node src/cli.ts hunt triage <run> --advisories <feed.json>`, inside `nix develop`.
  It labels each finding with the vendor fix that already covers it
- Target funnel, inside `nix develop`: `node src/cli.ts funnel fetch`, then `funnel rank`,
  `funnel enrich` and `funnel triage`. `node src/cli.ts program check` validates `programs/`
- Lab: `node src/cli.ts lab up` starts Mattermost 12.1.0 and PostgreSQL on an internal Docker
  network, creates three accounts, a channel and installs the Teams Meetings plugin; `lab down`
  removes it. `node src/cli.ts prove msteams-props-hijack` runs one attack there with a control.
- Packages: `nix build .#openhack`, `.#pi`, `.#shuvuln`

## Verified

2026-11-24, aarch64-darwin:

- `nix flake check` passes. The Linux systems are not checked from this machine.
- `openhack` 2.0.0 and the bundled `pi` 1.6.0 run from `nix build`.
- Before any login, `just auth-status` reports `not_ready` for both providers, and `just ping` fails
  with exit status 1 and Pi's own hint.
- A successful `just ping` is not verified yet. It needs the two logins.
- `nix flake check` runs 31 unit tests. A stand-in Pi covers the runner's deadline, cancellation,
  refusal, bad-output and cannot-start paths, and further tests cover the command line's argument
  handling. No provider is contacted by any test.
- After login, `just ping model=openai/gpt-6-sol` answers `pong` through Sign in with ChatGPT.
- After the z.ai key was replaced, `just ping` answers `pong` on `zai/glm-5.4`, `zai/glm-5.3-flash`
  and `openai/gpt-6-sol`. See [docs/PROVIDER-TERMS.md](docs/PROVIDER-TERMS.md).
- A clean clone of the public repository builds the same three store paths, and its flake check
  passes.
- The lab reproduces `msteams-props-hijack` on Mattermost 12.1.0 with plugin v3.0.0: with a planted
  post the bot offers the attacker's link, without one it offers none. Two runs in a row. Evidence
  lands in `$SHUVULN_HOME/proofs`.
- `funnel fetch` finds 80 programs with source in scope at the pinned dump, 326 pairs. Tier 2 on the
  top 40 kept 25 and dropped 15 client SDK wrappers, for 90k z.ai tokens.
- `hunt triage` on the Playbooks run paired both ignore-endpoint findings with MMSA-2024-00350 and
  raised no false pair among the other 32.
- On real Mattermost code, stock OpenHack at 4 workers and 4 steps costs about 3.5k tokens per
  kilobyte of scope. It found a known reflected XSS when the scan root held source and sink, and
  missed a known permission bug in a whole API layer. Numbers are in `docs/PLAN.md`.
- OpenHack runs through the bundled Pi. On the 60-line fixture, with 2 workers and 4 steps: 19 tasks
  complete in 206 seconds, 37 calls, 134k tokens in and 14k out, both planted mistakes validated by
  the full council. OpenHack's own gate passes on the patched tree: 154 tests.

## Structure

- `parts/`: flake-parts modules. `packages.nix` builds the packages. `development.nix` holds the dev
  shell, formatter, hooks and checks.
- `pkgs/`: `openhack.nix` is the MIT release archive, hash verified. `pi.nix` is Pi from
  `llm-agents.nix` with its own agent directory.
- `src/gateway/`: the model gateway. `args.ts` builds the Pi command line, `environment.ts` the
  child environment, `events.ts` the event-stream reader and `run.ts` the runner.
- `src/hunt/openhack.ts` runs the patched OpenHack. `pkgs/openhack-pi.nix` builds it from the last
  MIT commit plus `patches/openhack-pi-provider.patch`, so it reaches models only through Pi.
- `src/models.ts` is the model policy. `src/secrets.ts` stores tokens under `$SHUVULN_HOME/secrets`.
- `src/commands/`: the commands behind `src/cli.ts`.
- `src/triage/known.ts`: pairs a finding with a published vendor fix by the words of its title. The
  title alone: a summary adds enough words to drown the overlap.
- `src/funnel/`: the target funnel. `dataset.ts` reads the pinned program dump, `score.ts` is tier 1
  without a model, `triage.ts` is tier 2 with one stage-model call per candidate.
- `src/program/policy.ts` validates `programs/*.ts`. Run data from the funnel is in
  `$SHUVULN_HOME/funnel`.
- `src/lab/mattermost.ts`: the isolated lab. Docker for the target, the Mattermost API for setup and
  accounts, the event stream for observing what a plugin posts.
- Run data lives in `$SHUVULN_HOME` (default `~/.local/share/shuvuln`), never in the repository.
- `programs/`: one approved engagement policy per program as a TypeScript module, written from the
  program's brief. Nothing works on a program before its file names the approver.

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
- The lab pulls the Mattermost image and the plugin bundle at setup, then runs on a network with no
  way out. Its plugin settings are placeholders, so no Microsoft call can succeed.
- Model calls go only through shuvuln's own Pi. Never read or copy the system Pi's credentials.
- shuvuln's own stages run on z.ai (`STAGE_MODEL`). OpenAI is for OpenHack only (`OPENHACK_MODEL`).
- No credentials in code, prompts, containers, logs or commits.
- Commit, publish, deploy and any apply happen only on Shu's word. Do not bypass hooks.
