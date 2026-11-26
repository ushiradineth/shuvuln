# Provider terms

shuvuln reaches its two model providers only through its own Pi. Each provider's subscription terms
apply to how that Pi is used. This page maps the terms onto what shuvuln does and does not do. It is
a working summary, not legal advice.

## OpenAI: Sign in with ChatGPT Terms

The OpenAI login in shuvuln's Pi is Sign in with ChatGPT. Checked against the terms on 2026-11-24.

| Term                                                     | What shuvuln does                                                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use your app's own name. Do not impersonate OpenAI       | Sign-in happens inside Pi, bundled unmodified, under Pi's name                                                                                                   |
| Tokens only through the supported sign-in flow           | Pi obtains and stores them. shuvuln never reads, copies or prints them, and never calls `pi auth print-*`                                                        |
| Token storage local and under the user's control         | `$SHUVULN_HOME/pi-agent/auth.json`, file mode 600 in a directory with mode 700, on a machine Shu controls. Nothing syncs it                                      |
| Purpose limitation                                       | OpenHack's discovery calls only. Every other stage runs on z.ai                                                                                                  |
| No multiple accounts, splitting usage, rotating accounts | One account. The scheduler has no second account to switch to                                                                                                    |
| No pooling or sharing plan usage or tokens               | The gateway is not an API for other tools. It accepts shuvuln's prompts and nothing else                                                                         |
| Requests from a runtime the user controls                | Shu's Mac, or a NixOS host he owns. He signs in separately on each machine and never copies tokens between them                                                  |
| Express consent before background use                    | Foreground commands such as `just ping` are Shu's own activity. Before any unattended run exists, shuvuln requires a consent Shu records in its settings himself |
| Plan eligibility and usage limits apply                  | The scheduler waits on a refused request. It never works around a limit                                                                                          |
| No malware, no threat to users, OpenAI or third parties  | Authorised targets only, offline by default. No exploit code runs against a third party's system                                                                 |
| Do not alter the sign-in software                        | Pi comes from a pinned release and is not patched                                                                                                                |
| OpenAI may suspend or disable access it judges a risk    | Accepted knowingly. The z.ai path exists so that one provider's suspension does not stop the harness                                                             |

Two rules follow from this table and belong to the code, not only to this page:

- No unattended run starts without a recorded background-use consent.
- The gateway is never exposed as an endpoint. Other tools do not use shuvuln to reach OpenAI.

## z.ai: GLM Coding Plan usage policy

| Rule in the policy                                                | What shuvuln does                                                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Use only inside officially supported tools                        | Pi is on the supported list and makes every call                                                                                        |
| Subscription benefits exclusive to the subscriber                 | One subscriber, one account. No sharing                                                                                                 |
| Violations can bring rate limits, a freeze or a ban               | Same account-risk acceptance as above. Stop at the first risk notice                                                                    |
| A specific endpoint and a short model list                        | Pi's built-in z.ai provider uses the Coding Plan endpoint. The plan's models are the only ones requested                                |
| Error 1113 after purchase means the plan's conditions are not met | Seen on 2026-11-24 with a key that was not a plan key. A key created under the plan answered on the first try. The README keeps the fix |
