# shuvuln: plan

Status: plan, revision 3, 2026-11-24. Phase 0 is complete. Phase 1 is next. No target code has been
run and no program asset has been contacted.

## Goal

Run an autonomous system that researches every public bug bounty program, ranks the targets by
expected payout, reviews the source of the best ones, builds proof-of-concept proofs for what it
finds inside an isolated lab, and hands Shu a small set of reports he can reproduce with one command
and submit by hand.

The measure is accepted, non-duplicate payouts per dollar of model spend and per hour of review
time. Account risk stays close to zero, because the accounts are the business: a suspended Bugcrowd,
HackerOne, OpenAI or z.ai account ends the income.

## Decisions recorded

| #   | Decision                                                                                                              | Note                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Every model call goes through shuvuln's own Pi: z.ai Coding Plan and OpenAI through a Codex plan                      | Pi is a tool both plans support. See "Model access"                                                                                                             |
| 2   | shuvuln's Pi is bundled from llm-agents.nix, with its own agent directory and its own logins                          | The Pi on the system is never used                                                                                                                              |
| 3   | Pilot target: Mattermost on Bugcrowd, Playbooks plugin first                                                          | Scope confirmed from public program data today                                                                                                                  |
| 4   | Spend up to the providers' limits                                                                                     | Cost per proven finding is tracked anyway                                                                                                                       |
| 5   | Home: `~/Code/shuvuln`, public GitHub repository                                                                      | The repository is created only after Shu's explicit go                                                                                                          |
| 6   | Nix flake for dependencies, Docker for isolated workloads, NixOS module for the always-on worker                      | See "Isolation"                                                                                                                                                 |
| 7   | The orchestrator stays in TypeScript. Rust only where a measurement shows a need, behind a JSON command-line boundary | It sits between Pi and OpenHack, where the time goes to waiting                                                                                                 |
| 8   | Model policy: shuvuln's own stages run on z.ai GLM 5.4. OpenAI is for OpenHack only                                   | Decided by Shu on 2026-11-26. Both are reached through the bundled Pi                                                                                           |
| 9   | Program files are TypeScript modules, typed and validated when loaded                                                 | The Nix package runs the source with Node's type stripping and no `node_modules`. A YAML reader would be shuvuln's first runtime dependency. Decided 2026-11-26 |

## Facts checked on 2026-11-24

| Source                                                      | What I found                                                                                                                                                                                                                                                                                                                                                            | Effect on the design                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arkadiyt/bounty-targets-data`                              | MIT. Updated every 30 minutes. HackerOne 449 public programs (218 offer bounties), Bugcrowd 296, Intigriti 146, YesWeHack 52. HackerOne lists 36,341 URL assets, 2,652 wildcards and 330 source-code assets in scope. 84 programs have GitHub or GitLab repositories in scope (59, 15, 8, 2 by platform).                                                               | This is the target universe, about 943 programs. v1 can review source only for programs where source is in scope or public.                                                                                                 |
| Mattermost on Bugcrowd (same dump)                          | `max_payout` 2000, full safe harbor, disclosure not allowed, managed by Bugcrowd. In scope: 12 plugin repositories, desktop and mobile apps, a researcher-owned Cloud instance. Out of scope: six Mattermost websites.                                                                                                                                                  | Confirms the earlier transcript's scope claim. Reward tiers and the local-install clause still need a human look at the brief. Findings are never published.                                                                |
| HackerOne blog "AI-driven report volume"                    | Researchers are responsible for report quality whether a human or a tool wrote the first draft. Programs with open-source repositories in scope get more submissions and more duplicates because many researchers run AI code scanners on the same repositories. Triage uses the researcher's history to judge new accounts.                                            | Source-available programs are both the best fit and the most crowded. The score needs a saturation penalty, and the edge has to come from depth and proof, not from scanning the same code once more.                       |
| Bugcrowd policy post, 2026-03-10                            | Permanent ban for submission farming. Ten or more consecutive invalid reports triggers review and possibly a 30-day suspension when automated or AI activity is involved. Ten or more invalid reports triggers identity verification.                                                                                                                                   | The human gate is a financial control, not a formality. The harness needs a per-program submission stop.                                                                                                                    |
| HexBrain terms                                              | API keys are personal. "Do not try to get round them, for example with extra accounts." Reports belong to their authors. 200 API calls per day.                                                                                                                                                                                                                         | One account, one cached prefetch per engagement, no report text in the public repository.                                                                                                                                   |
| z.ai GLM Coding Plan usage policy                           | Plan "may only be used within officially supported tools and products. Use in unsupported tools may result in restricted benefits." No account sharing. More than three violations can lead to a ban. 5-hour and weekly quotas. Supported tools include Pi, Codex, OpenCode and Claude Code. Codex CLI is documented to use the plan through `https://api.z.ai/api/v1`. | shuvuln's own code never calls a model API. Pi makes every call, with the logins stored in Pi's own agent directory.                                                                                                        |
| OpenHack commits                                            | Tag `v2.0.0` (`81aa969f`) is MIT. The last MIT commit is `fc9d444f2712d1f233904b3eb27bbcec4fbbf224` (LICENSE checked). AGPL starts at `6666dde`. Between the tag and the last MIT commit only `src/harness/project.ts` changed in the harness (+7/-1, nested ignore exceptions). Release archives ship with SHA-256 files.                                              | Pin the MIT commit or the MIT release. Patches can be published under MIT terms.                                                                                                                                            |
| OpenHack harness source                                     | One review task per ~32k characters of source. Hypothesis-driven tasks only when the whole project fits in one batch. Advocate, skeptic and judge are separate runs. Disagreement leaves a finding `uncertain`.                                                                                                                                                         | The system-level inventory has to come from shuvuln.                                                                                                                                                                        |
| Claude-BugHunter                                            | MIT code, CC BY 4.0 content. The three reporting and methodology skills come from `shuvonsec/claude-bug-bounty`, which now lives at `awarexone/Agentic-Bug-Hunter` (MIT).                                                                                                                                                                                               | Copy with attribution. Check each file's origin before copying.                                                                                                                                                             |
| `anthropics/sandbox-runtime`                                | Apache-2.0. `sandbox-exec` on macOS and bubblewrap on Linux, plus HTTP and SOCKS proxies with domain allow-lists.                                                                                                                                                                                                                                                       | Reference for sandboxing any process that must reach one API host and nothing else. Only needed if a stage ever gets a shell.                                                                                               |
| Docker on this Mac (OrbStack, server 29.8.2, Compose 5.5.0) | Tested today: on an `--internal` network, container-to-container traffic and name lookup work, external DNS returns nothing, and a TCP connection to an internet address fails. On the default bridge both succeed. Test objects were removed.                                                                                                                          | Internal networks are a working egress block here.                                                                                                                                                                          |
| Mattermost code                                             | Playbooks plugin is Apache-2.0 with a separate enterprise licence file. The server lives in `mattermost/mattermost` with the same two-licence layout. GitHub's advisory API lists none for either.                                                                                                                                                                      | Local builds for research are fine. The answer-key recipe is still open (Phase 1).                                                                                                                                          |
| This machine and hosts                                      | Mac: 16 GB RAM, 10 CPUs, Docker limited to about 10 GB. three NixOS hosts, named in the private `nix-config`.                                                                                                                                                                                                                                                           | Research stages run on the Mac. Labs and the steady-state worker belong on a Linux host if one has the memory and disk.                                                                                                     |
| OpenAI Sign in with ChatGPT Terms                           | Shu supplied the text on 2026-11-24. The Usage Policies are still unread.                                                                                                                                                                                                                                                                                               | Mapped in [PROVIDER-TERMS.md](PROVIDER-TERMS.md). Two rules follow: no unattended run without a recorded consent, and the gateway is never an endpoint for other tools. OpenAI may suspend access it judges a security risk |

## Mattermost brief, read by Shu on 2026-11-26

Recorded as the approved policy in [../programs/mattermost.yaml](../programs/mattermost.yaml). The
brief was last updated on 2026-11-20.

- Pays P1 $2,000, P2 $750, P3 $300, P4 $150. Average payout over the last three months is $310. 75%
  of submissions are decided within 10 days. Three acceptances in the week before reading.
- Local installation is explicitly allowed, from source or download. A researcher-owned Cloud
  instance is also in scope.
- Known issues per target, closed as not applicable: Cloud 77, Agents 10, Playbooks 6, Boards 6,
  Jira, GitHub and GitLab 4 each, Zoom and Confluence 3, Calls 2, Calendar 1, Metrics, Channel
  Export and Teams Meetings 0.
- Ineligible unless more is shown: SSRF needing system admin (except on Cloud), self-XSS with more
  than two steps, open redirect without further impact, anything a configuration option mitigates,
  default elevated permissions a setting can restrict, and unconfirmed scanner output.
- The brief does not address automation limits or AI. Bugcrowd's platform rules apply.
- Identity verification is required before submitting.

Implication for the funnel: the three newest in-scope plugins have no known issues yet. After the
Playbooks pilot they are the likeliest places for a finding that is not a duplicate.

## Phase 1 measurements, 2026-11-26

- A scan root must hold the whole flow. OpenHack follows calls with its own tools, but only inside
  the directory it was given. Phase 3's scopes therefore come from call graphs, not from repository
  layout.
- The stock engine costs about 3.5k tokens in per kilobyte of scope at 4 workers and 4 steps. A
  whole first-party server tree is tens of megabytes, so it is out of reach as one scan.
- Two access-logic cases are the hard class so far: one XSS was found, one permission bug was not.
- On z.ai, the gateway's default thinking level did not finish in four minutes on a 15 KB file,
  while `low` answered in two seconds. Every z.ai stage sets its thinking level on purpose.
- The Mattermost feed at `securityupdates.mattermost.com` is the pairing source for this vendor: fix
  versions, dates and researcher credit per advisory. Other vendors need their own.

## First hunt on current code, 2026-11-26

Stock OpenHack on the Playbooks plugin's server code at `e0717887`, 1.5 MB, 4 workers, 6 steps: 179
tasks in 1,555 seconds, 828 calls, 13.6M tokens in, 15 findings (5 validated, 9 uncertain, 1
rejected). `hunt triage` paired one with an advisory on generic words, a false pair. Shu asked for
high-confidence items only. A reading of the four validated findings against the code kept none:

- The playbook PATCH checks "manage properties", not "edit". The plugin separates the two on
  purpose, and `AdminOnlyEdit` locks content, not properties. By design.
- A keyword action can suggest a private playbook's title in a channel. The configurer needs
  channel-action and playbook-view rights, and the feature exists to suggest playbooks in channels.
  A title, leaked by an insider.
- The playbook list has no upper bound on `per_page`. Denial of service, unmeasured, and the brief
  excludes self-affecting denial of service.
- Favorites keep names after access to a playbook or run is revoked. Minor information leak.

Lesson: on code that has had years of attention, the stock engine's validated findings were 0 of 4
worth a report, where on old snapshots 2 of 3 were real. Newer code with fewer eyes is where the
method pays: the three Mattermost plugins with no known issues, and new programs.

## Hunts on the three newest Mattermost plugins, 2026-11-26

Stock OpenHack on each plugin's `server/` at master, 4 workers, 6 steps:

| Plugin         | Bytes  | State                 | Calls | Tokens in | Findings                                                     |
| -------------- | ------ | --------------------- | ----- | --------- | ------------------------------------------------------------ |
| metrics        | 393 KB | partial, 0 candidates | 12    | 206k      | 0                                                            |
| channel-export | 56 KB  | complete              | 22    | 243k      | 1 validated, CSV formula injection, which the brief excludes |
| teams-meetings | 47 KB  | complete              | 31    | 365k      | 1 validated, 2 uncertain                                     |

The server directories are far smaller than the repositories, so the three cost 810k tokens in all,
not 30M. Reading the code kept two findings in the teams-meetings plugin, both absent from its 15
public issues and from the advisory feed:

- A member can plant `meeting_link` in a post's properties; within 30 seconds the plugin shows it,
  as the bot, with a "join" button and a chosen creator name to whoever starts a meeting. The check
  never looks at who wrote the post, and Mattermost keeps properties set through the API.
  Reproducible locally, since the path runs before any Microsoft sign-in.
- The OAuth state is a predictable string with no nonce. The callback's checks, equality with the
  stored value and a logged-in user, are what CSRF defeats, so a victim who clicks a crafted link
  gets the attacker's Microsoft account linked. Needs an abandoned connect, a known channel ID and a
  click.

Neither is proven. Both need the Phase 4 lab before anything is reported.

## Autonomy and human gates

Autonomous, unattended, within budgets:

- reading public program data, the HackerOne report index and repository metadata
- scoring and ranking programs
- cloning public repositories and reviewing source
- building and running labs with no internet access
- running proofs and drafting reports

Human gates, each recorded in a file the harness checks before it proceeds:

1. `program.yaml` approval per program: scope, exclusions, allowed techniques, automation and AI
   rules, submission stop.
2. A live-check approval per target. v1 has no live checks at all.
3. Submission. Shu reproduces each proof and submits by hand.

## Target funnel

Three tiers, each cheaper than the next, so model spend lands on the few targets that deserve it.

| Tier            | Input                                                    | Method                                                                                                                                                                                                                                                                      | Output                                                   |
| --------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1 Score         | 943 programs and their in-scope assets from the MIT dump | No model. Payout ceiling, source in scope, repository size, language, commit rate in 90 days, contributors, age, managed or direct program, response efficiency, average time to bounty, disclosure allowed, disclosed report count and recency (HexBrain), platform weight | Ranked list with reasons. About 100 programs             |
| 2 Triage        | Tier 1 survivors                                         | One cheap model call per program-repo pair. Reads the README, the top-level tree and the scope text. Emits fit notes and risk flags                                                                                                                                         | About 20 programs for Shu to approve into `program.yaml` |
| 3 Deep research | Approved programs                                        | Clone at a pinned ref, deterministic inventory, one quick OpenHack scan per system, recall estimate from the program's disclosed reports                                                                                                                                    | About 5 targets for the full pipeline                    |

Saturation penalty: HackerOne programs weigh heavier than Bugcrowd, Intigriti and YesWeHack. Many
disclosed reports in the last year weigh heavier than few. Old, little-changed code weighs heavier
than code with recent releases. Preferred targets are plugins, extensions and smaller codebases of a
large product, new releases, and access-control and business-logic classes that line scanners handle
badly.

v1 covers the 84 programs with source in scope plus programs whose in-scope product is public
source. URL-only programs need black-box research, which is not built.

## Pipeline per target

```
program.yaml          approved scope, rules, submission stop
   |
brief                 program history, rejected reports, playbooks (one HexBrain prefetch, cached)
   |
inventory             systems from route, handler, schema and hook registrations
   |
hunt                  OpenHack scan per system, MIT-pinned build, exclusions in context
   |
prove                 Docker lab: effect on vulnerable build, none on patched, control passes on both
   |
review                skeptic pass with evidence requirements, proof kept as a re-runnable test
   |
draft                 report in the platform's format, duplicate check, hand-off to Shu
```

Finding states and the failure table from revision 1 still apply: `candidate`, `triaged`, `proven`,
`refuted`, `unresolved`, `drafted`, then the submission outcome Shu records. Only `proven` findings
are drafted. A rejection must cite blocking evidence at a real file and line or record a minimum
number of failed attempts.

## Isolation

### What has to be contained

| Risk                                                                                   | Where it comes from | Contained by                                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Malicious or prompt-injected source, build scripts, dependencies, model-written proofs | Running target code | Docker only. Never on the host                                                                               |
| A model-controlled process leaking a credential or reaching the internet               | Agents with tools   | Pi runs with tools disabled and owns the logins. The orchestrator executes the model's output inside the lab |
| Findings, report text, personal data, keys in the public repository                    | Run data            | Run data lives outside the repository. Secret scan on commit. A test fails the build on report-like files    |
| Out-of-scope testing                                                                   | A live stage        | No live stage in v1. Later: egress proxy with an exact allow-list and per-target approval                    |

Invariant: no model-controlled process holds a credential and an unrestricted network at the same
time.

### Docker, for everything that runs target code

- One compose project per target, with a vulnerable and a patched instance.
- An `internal: true` network for the running lab (verified to block DNS and IP egress here).
- A separate build network whose only exit is a proxy with a registry allow-list (npm, the Go module
  proxy, PyPI, crates, GitHub archives, OS mirrors). No secrets, no host home, a scratch mount, and
  resource limits on the builder.
- Hardened run containers: read-only root filesystem, all capabilities dropped, no new privileges, a
  non-root user, PID, memory and CPU limits, ports on 127.0.0.1 only.
- Image digests recorded in a lock file. The lab refuses to start if any image is unpinned or the
  network is not internal. A canary fetch must fail before a proof may run.

### Nix, for the supply chain

- The flake pins nixpkgs and every tool: Node, pnpm, Python, git, gh, jq, gitleaks, OpenHack.
- OpenHack is the MIT release archive fetched by URL and hash. If a patch is needed, the MIT commit
  is built from source instead.
- Builds of a target can be Nix derivations: dependencies fetched by hashed fixed-output
  derivations, the build itself offline. Start with the Playbooks plugin. The Docker image then
  copies the built artifact. This is the strongest supply-chain option and costs per-target work, so
  it is used for the few deep targets only.
- Nix's build sandbox does not isolate on macOS. On the Mac, Docker is the only boundary.

### NixOS, for the always-on worker

A NixOS module runs the orchestrator as a hardened systemd service (`DynamicUser`, read-only system,
empty network namespace except the proxy, memory and task limits). Target code still runs in Docker.
Deployment to one of the NixOS hosts follows the existing colmena flow and asks first, like every
apply.

## Repository

```
shuvuln/
  README.md  LICENSE  NOTICE  SECURITY.md  AGENTS.md  flake.nix  flake.lock  justfile
  parts/          flake-parts modules: packages, dev shell, formatter, checks, hooks
  pkgs/           openhack (MIT release), pi (bundled, own agent directory)
  lib/            pinned Node type definitions for the Nix checks
  docs/PLAN.md  docs/LICENCES.md  docs/THREAT-MODEL.md
  src/            TypeScript, zero runtime dependencies, node:test
    gateway/       the model gateway: arguments, environment, event reader, runner
    commands/      auth status and login, gateway ping
    cli.ts
  skills/         cherry-picked methodology skills (later), each with its licence header
  labs/<target>/  compose files, Dockerfiles, seed scripts (later). No target source
  tests/  fixtures/   deliberately vulnerable apps written for shuvuln (later)
```

Run data lives in `SHUVULN_HOME` (default `~/.local/share/shuvuln`): checkouts, scans, brief caches,
proofs, findings, the ledger. The repository ignores `runs/` and `.env` as well.

Public: code, docs, fixtures the project authors itself. Never public: findings, proofs against
third-party software, HackerOne report text, program logos, credentials, lab images of third-party
software.

Licence: Apache-2.0 for shuvuln. `NOTICE` credits OpenHack (MIT commit), Claude-BugHunter content
(CC BY 4.0, with a link and a note of changes), bounty-targets-data (MIT), HexBrain (data used at
run time, not redistributed).

Publication is a request to Shu, never a side effect: the public repository is created with
`gh repo create --public` only after he says so.

Legal footing, in plain terms: building and publishing an authorized bug-hunting tool is lawful. The
exposures are out-of-scope testing, breaking a platform's or provider's terms, and licence breaches.
Each is designed out: no live stage without approval, platform data from the MIT dump rather than
scraping, one HexBrain account within its limits, z.ai only through supported tools, MIT-pinned
OpenHack, attributed CC BY content. This is not legal advice.

## Model access: shuvuln's own Pi

No shuvuln code calls a model API. Each call is made by Pi, and Pi is on the supported list of both
plans. shuvuln bundles its own Pi from `llm-agents.nix` (1.6.0), separate from the Pi on the system:
another binary, another agent directory (`$SHUVULN_HOME/pi-agent`), and the only place the two
logins exist.

| Caller                                                              | How it reaches Pi                                                                                                                                                 | Model                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Orchestrator stages (triage, proof writing, skeptic pass, drafting) | Spawns `pi --mode json` with tools, sessions, extensions, skills and context files disabled. The prompt travels on stdin. Token use is read from the event stream | `zai/...` or `openai/...` |
| Discovery engine (OpenHack)                                         | A `pi` provider added to the MIT commit, modelled on its existing Codex and Claude Code adapters. OpenHack itself holds no credential                             | Same                      |
| Shu, interactively                                                  | The same bundled Pi, for review and lab recipes                                                                                                                   | Any logged-in model       |

Rules: stay inside plan limits, never rotate accounts, stop at the first risk notice.

Verified on 2026-11-24: the bundled Pi starts with its own agent directory, both providers report
`not_ready` before login, and a gateway call before login fails with Pi's own hint and a non-zero
exit. After login, `openai/gpt-6-sol` answers `pong` through Sign in with ChatGPT (451 tokens in, 5
out, no retry). After the z.ai key was replaced with one created under the plan, `zai/glm-5.4` and
`zai/glm-5.3-flash` answer too.

## Phases

### Phase 0: repository and toolchain

Done on 2026-11-24, aarch64-darwin:

1. Repository layout, Apache-2.0 `LICENSE`, `NOTICE`, `SECURITY.md`, `.gitignore`.
2. Flake: nixpkgs-unstable, flake-parts, treefmt, pre-commit hooks (alejandra, prettier, deadnix,
   statix, typos, gitleaks), Nix checks for types and unit tests. Packages: `openhack` 2.0.0 (MIT
   release, hash verified), `pi` (bundled from llm-agents.nix, own agent directory), `shuvuln`.
3. Model gateway in `src/gateway/`: spawns the bundled Pi with every isolation flag, parses the
   event stream, and reports usage, retries, tool executions (always a violation) and every reason a
   run cannot be trusted. Unit tests cover the parser, the argument builder, and the runner's
   deadline, cancellation, refusal, bad-output and cannot-start paths against a stand-in Pi. No test
   contacts a provider.
4. Before login: `just auth-status` reports both providers `not_ready`. `just ping` fails with Pi's
   own hint and exit status 1.

Closed on 2026-11-24:

5. Shu logged in. `just ping` answers `pong` on `openai/gpt-6-sol` (Sign in with ChatGPT) and, after
   the key was replaced with one created under the plan, on `zai/glm-5.4` and `zai/glm-5.3-flash`.
6. Public repository at https://github.com/ushiradineth/shuvuln, created on Shu's instruction after
   both providers' terms were checked against the design in [PROVIDER-TERMS.md](PROVIDER-TERMS.md).
7. Exit check met: a clean clone of the public repository builds the same three store paths as the
   local tree, and its flake check passes.

Exit: a clean clone builds the same environment twice, and `just ping` succeeds on both providers.
Met on 2026-11-24.

### Phase 1: OpenHack through Pi, baseline and answer key

1. Done on 2026-11-26. A `pi` provider for OpenHack at the last MIT commit (`fc9d444f`), kept as
   `patches/openhack-pi-provider.patch` and built in the flake as `openhack-pi`. It is modelled on
   the subscription adapters: one stateless Pi call per round, the same JSON envelope, fail-closed
   event checks, usage read from Pi's stream. Pi cannot enforce a schema, so the adapter takes the
   first complete envelope of a reply, closes a reply left open at its end, and reports both in the
   event log. OpenHack's own gate passes on the patched tree (154 tests). Evidence on the 60-line
   fixture, 2 workers, 4 steps: 19 tasks complete in 206 seconds, 37 calls, 134k tokens in and 14k
   out. Both planted mistakes were validated by the full council. 7 further candidates were held
   back as uncertain. Before the fix, 8 of 18 tasks failed on glued or truncated replies.

2. Done on 2026-11-26 for the source-available reports. 19 disclosed HackerOne reports came from
   HexBrain's open endpoints, and 762 Mattermost advisories from the feed the vendor's own
   security-updates page renders, `securityupdates.mattermost.com/security_updates.json`. Each
   advisory names the fix versions and credits the researcher, so 11 reports pair to an advisory by
   credit or by description: 3 at adjacent patch releases, where the diff is the fix, and 8 at the
   previous minor release. 8 reports do not pair: customer-portal and cloud-configuration issues,
   one closed as not applicable, and three without a credited advisory. The key lives in
   `$SHUVULN_HOME/answer-key/mattermost/cases.json`, private because report text belongs to its
   authors. No pair is proven by a differential proof yet.
3. Partly done on 2026-11-26, by directory scope, since OpenHack has no path filter. Stock OpenHack
   through the bundled Pi, `openai/gpt-6-sol`, 4 workers, 4 steps:

   | Case, vulnerable tag                             | Scope                     | Found                         | Calls | Tokens in | Seconds |
   | ------------------------------------------------ | ------------------------- | ----------------------------- | ----- | --------- | ------- |
   | OAuth reflected XSS, v5.35.2                     | `web/`, 157 KB            | no, sink outside the root     | 21    | 330k      | 82      |
   | OAuth reflected XSS, v5.35.2                     | `web/` + `utils/`, 199 KB | yes, twice                    | 57    | 756k      | 153     |
   | Slash command in read-only channel, v7.8.4       | `api4/`, 812 KB           | no, 12 other findings         | 223   | 2,832k    | 465     |
   | Control: the same XSS, fixed tag v5.35.3         | `web/` + `utils/`, 199 KB | not reported, as it should be | 93    | 1,033k    | 255     |
   | Playbooks unbounded request size, plugin v1.29.1 | plugin `server/`, 936 KB  | no, 34 other findings         | 767   | 11,463k   | 1,516   |

   In the Playbooks scan, two validated findings were real bugs that Mattermost fixed years later:
   deleting arbitrary posts through the ignore endpoints (MMSA-2024-00350, fixed in 2024) and
   updating a channel action without checking it belongs to that channel (fixed in June 2026, with
   no advisory). The engine therefore finds access-control bugs in plugin code, and missed the two
   "missing limit" cases and one permission-logic case. Of its 34 Playbooks findings, 4 were
   validated, 27 uncertain and 2 rejected. Cost is close to 3.5k tokens in per kilobyte of scope,
   and 12k when many candidates reach the council. The second row is the lesson for Phase 3: the
   source sat in `web/oauth.go` and the sink in `utils/api.go`, and a scan root that cuts the flow
   loses the bug. The third row is a permission-logic bug, which the engine did not see in a whole
   layer. The third patch-level case, the automatic response size limit fixed in `model/` and the
   store, is unmeasured: its natural scope is over 2 MB. A scan of a whole first-party tree is
   unmeasured too. The fixed tags of the two missed cases were not scanned.

Exit: a recall and cost table for the stock tool, produced through the bundled Pi.

Stop: fewer than 5 cases build from source at both refs, or the `pi` provider cannot pass OpenHack's
own adapter tests. Neither stop has fired.

### Phase 2: target funnel

1. Done on 2026-11-26. `funnel fetch` downloads the dump at commit `c144723c` and keeps the programs
   with a source repository in scope: 80 programs, 326 program-repo pairs (Bugcrowd 15, HackerOne
   55, Intigriti 8, YesWeHack 2).
2. Done on 2026-11-26. `funnel rank` scores each pair without a model: payout ceiling, platform
   (HackerOne weighs heavier), component of a larger product, whole organisation in scope, program
   age, and, once `funnel enrich` has cached the GitHub API's facts, repository size, time since the
   last change and archived state. `funnel triage` then makes one short z.ai call per candidate,
   reading the README: keep or drop, with a kind and a reason. The question also names the languages
   the review reads well, so memory-safety and smart-contract repositories are dropped. With a
   GitHub token (`just secret-set github`) all 272 repositories have facts. All 272 were triaged for
   about 500k z.ai tokens: 116 kept, 22 of them in 5 paying programs: Auth0, Mattermost, Infomaniak,
   Electroneum and SecureDrop. The other 94 kept repositories belong to unpaid disclosure programs.
   Verdicts carry a version, so a changed question re-triages.

3. Done on 2026-11-26. Program files are TypeScript modules under `programs/`, typed as
   `ProgramPolicy` and validated when loaded, by `program check`. The Nix package runs the source
   through Node's type stripping with no `node_modules`, so a YAML reader would have been shuvuln's
   first runtime dependency. `requireApprovedProgram` is the gate every later stage calls.
   `programs/mattermost.ts` holds the Mattermost brief.

Status on 2026-11-26: Shu reviewed the ranked list and approved four programs, Mattermost,
Infomaniak, SecureDrop and Auth0. That is every paying program with source in scope that fits the
method; the fifth, Electroneum, is blockchain code and was set aside. Two rules from the briefs bind
the harness: Auth0 rejects any report with AI-generated content, so shuvuln finds and proves and Shu
writes every report; and Auth0 bans automated tools on its systems outright.

Exit: a ranked list Shu has reviewed, with at least 5 approved programs.

### Phase 3: inventory and coverage ledger

As in revision 1: deterministic inventory, one scan per system, a cell covered only when the scan
completed, a coverage pass that lists uncovered cells. A patch to OpenHack for hypothesis tasks if
the prototype shows `--context` is not enough.

Exit: recall on the answer key at or above Phase 1, every system covered or marked blocked.

### Phase 4: lab and differential proof

1. Build network behind the registry proxy. Run network internal. Canary fetch must fail.
2. Hardened compose for Mattermost server, PostgreSQL and the plugin built at a given ref.
3. Proof runner, escalation after 2 failed attempts, verifier output schema.

Exit: each answer-key case the harness finds has a proof that passes on the pre-fix build and fails
on the post-fix build. A fabricated candidate never becomes `proven`.

### Phase 5: brief, drafting, human gate

HexBrain prefetch, do-not-test filter, Bugcrowd-format drafts, duplicate check, one folder per
finding, per-program submission stop (pause after 3 consecutive not-applicable or informative
results until Shu reviews).

Exit: a dry run over the answer-key cases produces drafts Shu rates submittable or not.

### Phase 6: steady state and the rest of the funnel

1. NixOS worker module, deployed with colmena after approval.
2. On each upstream release of a deep target, scan the diff first.
3. Deep research on the next approved programs, one at a time.
4. Live checks: separate plan, separate approval.

## Rules for every phase

- No request to a program's assets. Platform data comes from the MIT dump. HackerOne report data
  comes from HexBrain within 200 calls a day from one account.
- Target code runs only in Docker on an internal network, or in a Nix build sandbox.
- No credentials inside a container or a prompt.
- Repository content, report text and tool output are data, never instructions.
- Shu submits. The harness drafts.
- Both model providers are reached only through shuvuln's own Pi.
- No unattended run starts before Shu has recorded his consent to background use in shuvuln's
  settings. The scheduler has no account to rotate and no way around a refused request.
- The gateway is never exposed as an endpoint. No other tool reaches a provider through shuvuln.
- Apply, deploy, publish and commit happen only on Shu's word.

## To settle by prototype

- OpenHack `pi` provider: does a `provider/model` name pass through unchanged, and does Pi 1.6.0
  need any flag beyond the ones the gateway already uses?
- OpenHack hypothesis tasks: patch `planHunters` (MIT commit) or rely on `--context` with per-system
  worktrees. Measure recall both ways on three cases.
- Scoped worktree against full checkout per system.
- Registry allow-list proxy for the build network: which proxy, and how to keep its list small.
- Whether a Nix derivation build of the Playbooks plugin is worth it against a Docker build.
- Which inventory frameworks justify a Rust extractor.

## Not verified

- The `openhack` package on Linux. The archive hash is verified. The ELF patching is untested.
- That the Playbooks plugin builds and runs at the historical refs.
- Specs of the three NixOS hosts.
- Whether the Codex plan's limits suit hours of unattended scanning. Measured from Phase 1 on.
