import type { ProgramPolicy } from "../src/program/policy.ts"

// Engagement policy for one bug bounty program. Nothing in shuvuln works on a program until this
// file names who approved it. Written on 2026-11-26 from the brief Shu pasted after signing in.
// Not approved yet: approved_by is empty.
const securedrop = {
  program: "securedrop",
  platform: "bugcrowd",
  brief: "https://bugcrowd.com/engagements/freedomofpress",
  brief_last_updated: "2026-11-09",
  approved_by: "",
  approved_on: "",

  // v1 proves findings in a local lab only. The brief recommends a local instance for testing,
  // but pays nothing for a flaw that depends on a development or virtualised environment.
  live_testing: "unapproved",
  local_installation: "allowed",

  safe_harbor: "partial",
  identity_verification_required: true,
  disclosure: "None. Information about vulnerabilities may not be released to the public.",
  rating:
    "Bugcrowd Vulnerability Rating Taxonomy. Minimum awards by attack: XSS in the journalist interface $500; SQL injection there $750; authentication bypass there $1,000; XSS in the source interface $1,500; SQL injection or authentication bypass there $2,000; XSS or SQL injection in the Inbox $2,000; code execution on a Workstation VM other than sd-view $2,000; remote code execution on either server interface, or extraction of key material or decrypted submissions, $2,500. The source interface pays more than the journalist interface, which needs an onion-service token.",

  // The low end of each range. P1 runs to $2,500, P2 to $1,500, P3 to $750, P4 to $200.
  rewards_usd: { P1: 2000, P2: 1000, P3: 500, P4: 100 },
  average_payout_usd_last_3_months: 2000,
  vulnerabilities_rewarded: 14,
  triage: { validation_within_days: 12, percent_decided_within_10_days: 0 },

  accounts: {
    email_domain: "bugcrowdninja.com",
    signup: "https://docs.securedrop.org/en/latest/development/setup.html",
    roles: ["Source", "Journalist", "Administrator"],
    note: "No accounts are provided. The brief recommends deploying a local instance with the project's own deployment process.",
  },

  targets: [
    {
      name: "SecureDrop server, source and journalist interfaces",
      source: "https://github.com/freedomofpress/securedrop",
    },
    {
      name: "SecureDrop Workstation",
      source: "https://github.com/freedomofpress/securedrop-workstation",
    },
    {
      name: "SecureDrop client and Inbox",
      source: "https://github.com/freedomofpress/securedrop-client",
    },
  ],

  out_of_scope: [
    "Anything that is not the SecureDrop application code, unless the attack exploits SecureDrop through it",
    "Projects that are not in production use",
  ],

  ineligible: [
    "Pre-existing GitHub issues",
    "Bugcrowd's standard non-qualifying submission types",
    "Network and application denial of service, including continuous large submissions and continuous codename generation",
    "Disclosure of known public files or directories, such as the codename word lists or test-only PGP keys",
    "Attacks that rely on browsers other than Tor Browser or Tails",
    "Attacks on third-party providers",
    "Attacks that rely on the development environment or the virtualised platform, including default credentials there",
    "Functional, UI and UX bugs and spelling mistakes",
    "Unsigned pip, npm or Rust packages",
    "Descriptive error messages, stack traces",
    "Lack of HTTPS, since onion services are used",
    "Metadata left on uploaded documents, which is intended",
    "Missing HTTP security headers",
    "Attacks on the Workstation started from dom0, or that need dom0 access",
    "IDOR based on every journalist and admin having access to all sources and submissions",
    "The Flask session cookie disclosing the source codename",
    "Credentials left in dom0 after Workstation installation, or their permissions",
    "HOTP or TOTP secrets or tokens in server logs",
    "A 2FA reset that does not prompt for re-authentication",
    "Locking out a journalist with the username, 2FA credentials and onion-service token",
  ],

  known_issues: [
    "Pre-existing GitHub issues are ineligible, so search the issue trackers before submitting.",
  ],

  automation: {
    unconfirmed_scanner_reports: "ineligible, and denial of service is excluded",
    excluded: [
      "Denial of service",
      "Continuous large submissions",
      "Continuous codename generation",
    ],
    note: "The brief sets no automation rule beyond that. Static review of the public source makes no request.",
  },

  ai_policy:
    "Not addressed in the brief. Bugcrowd's platform rules apply. The researcher is accountable for every submission.",

  submission_stop: { after_consecutive_not_applicable_or_informative: 3 },
} satisfies ProgramPolicy

export default securedrop
