# Third-party licences

Checked on 2026-11-24.

| Component             | Licence        | How shuvuln uses it                                      | Obligation                                                                                       |
| --------------------- | -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| OpenHack v2.0.0       | MIT            | Pinned release binary in `pkgs/openhack.nix`             | Keep the licence text with the package                                                           |
| OpenHack after v2.0.0 | AGPL-3.0       | Not used. A patch is written against the last MIT commit | Re-check the licence line before moving the pin                                                  |
| Pi 1.6.0 (llm-agents) | MIT            | Bundled with its own agent directory in `pkgs/pi.nix`    | None beyond the licence                                                                          |
| bounty-targets-data   | MIT            | Program scope data, read at run time (Phase 2)           | Credit. Program logos belong to the programs                                                     |
| HexBrain              | Data           | HackerOne report index through its API (Phase 2)         | One account within its limits. Reports belong to their authors. No report text in the repository |
| Claude-BugHunter      | MIT, CC BY 4.0 | Methodology skills copied into `skills/` (Phase 5)       | Credit Sachin Sharma and Claude-BugHunter, link, state changes                                   |
| sandbox-runtime       | Apache-2.0     | Reference for allow-list sandboxing, if ever needed      | None unless code is copied                                                                       |

The z.ai Coding Plan and OpenAI Codex plan are subscriptions, not licences. Both are used only
through Pi, which each provider lists as a supported tool.
