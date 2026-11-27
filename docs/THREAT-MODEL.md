# Threat model

Three things can go wrong in an automated bug bounty harness: target code misbehaves on the machine,
a model-controlled process leaks a credential or reaches something it should not, and private
material ends up in a public place. Each is stopped by a mechanism, not by a prompt.

## What is contained, and by what

| Risk                                                             | Source              | Contained by                                                                                                 | State         |
| ---------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| Malicious or prompt-injected source, build scripts, dependencies | Running target code | Docker only: internal network, read-only root, dropped capabilities, resource limits                         | Phase 4       |
| A model-controlled process leaking a credential or reaching out  | Agents with tools   | Pi runs with tools disabled and owns the logins. The orchestrator executes the model's output inside the lab | Gateway: done |
| Findings, report text, personal data or keys in the repository   | Run data            | Run data lives outside the repository. Secret scan on every commit                                           | Done          |
| Out-of-scope testing                                             | A live stage        | No live stage. A later one needs an egress proxy with an exact allow-list and per-target approval            | Not built     |

Invariant: no model-controlled process holds a credential and an unrestricted network at the same
time.

## The model gateway

- The orchestrator spawns shuvuln's own Pi with `--no-tools`, `--no-session`, `--no-extensions`,
  `--no-skills`, `--no-prompt-templates`, `--no-themes`, `--no-context-files` and `--no-mcp`.
  `src/gateway/args.ts` adds them to every call and a unit test fails if a call lacks one.
- The child gets an environment with only operating-system locations and the path of shuvuln's Pi
  agent directory. Provider keys are never placed there by shuvuln. A unit test checks it.
- The prompt travels on stdin, in an empty temporary directory, so a prompt cannot pick up project
  files.
- Any tool execution reported in the event stream is treated as a violation, even though tools are
  disabled.

## Docker, for everything that runs target code

- One compose project per target, with a vulnerable and a patched instance.
- An `internal: true` network for the running lab. Measured on this machine on 2026-11-24 (OrbStack,
  Docker 29.8.2): containers reach each other, external DNS returns nothing, and a TCP connection to
  an internet address fails.
- A separate build network whose only exit is a proxy with a registry allow-list.
- Read-only root filesystem, all capabilities dropped, no new privileges, a non-root user, PID,
  memory and CPU limits, ports on 127.0.0.1 only.
- Image digests in a lock file. The lab refuses to start on an unpinned image or a non-internal
  network, and a canary fetch must fail before a proof runs.

## Nix, for the supply chain

- The flake pins nixpkgs and every tool. OpenHack is the MIT release archive, fetched by URL and
  hash. Pi comes from a pinned `llm-agents.nix`.
- Nix's build sandbox does not isolate on macOS. On the Mac, Docker is the only boundary.

## NixOS, for the always-on worker

The orchestrator runs as a hardened systemd service. Target code still runs in Docker.

## Lab

The lab runs the target, not the researcher's tools. `lab up` downloads the Mattermost image and the
plugin release on the host, then starts both containers on a Docker network created with
`--internal`, which has no route out. Mattermost's database is a second container on the same
network. The host reaches Mattermost by its address on that network, which OrbStack routes, to
create accounts and to run the proof. The plugin's OAuth settings are placeholders, so no Microsoft
call can succeed, and none is needed for the candidate under test. Lab accounts and their passwords
are fixed and exist only in the lab's data, which `lab down` removes.
