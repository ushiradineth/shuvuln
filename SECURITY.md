# Security

## Authorised use only

shuvuln exists for security research on targets that a bug bounty program or their owner has
authorised in writing. Before any work on a program, the program's scope, exclusions, allowed
techniques and automation rules are recorded in a file that the operator approves. The harness
refuses to run against a program without that file.

Out of scope, always: testing assets outside a program's published scope, denial of service, brute
force, persistence, bulk extraction of personal data, and any contact with third-party systems from
the harness. In the current phase the harness makes no request to any program asset at all.

## What the harness will not do

- Submit a report. It drafts. A person reproduces each proof and submits.
- Run target code outside Docker on an internal network.
- Put a credential inside a container, a prompt or a log. Model logins stay in shuvuln's own Pi
  agent directory, outside the repository.
- Commit run data, findings, proofs against third-party software or report text. The repository
  ignores them and a secret scan runs on every commit.

## Reporting a security issue in shuvuln

Use GitHub's private vulnerability reporting on this repository. Please do not open a public issue
for a security problem.

## Isolation design

[docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) lists what has to be contained and by what.
