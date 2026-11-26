import type { ProgramPolicy } from "../src/program/policy.ts"

// Engagement policy for one bug bounty program. Nothing in shuvuln works on a program until this
// file exists and names who approved it. Written from the brief on 2026-11-26.
const mattermost = {
  program: "mattermost",
  platform: "bugcrowd",
  brief: "https://bugcrowd.com/engagements/mattermost-mbb-public",
  brief_last_updated: "2026-11-20",
  approved_by: "shu",
  approved_on: "2026-11-26",

  // v1 proves findings in a local lab only. Any request to a program asset needs its own approval.
  live_testing: "unapproved",
  local_installation: "allowed",

  safe_harbor: "full",
  identity_verification_required: true,
  disclosure: "coordinated, needs explicit permission through the disclosure request option",
  rating:
    "Bugcrowd Vulnerability Rating Taxonomy; a priority may be lowered with a reason, and appealed",

  rewards_usd: { P1: 2000, P2: 750, P3: 300, P4: 150 },
  average_payout_usd_last_3_months: 310,
  vulnerabilities_rewarded: 250,
  triage: { validation_within_days: 10, percent_decided_within_10_days: 75 },

  accounts: {
    email_domain: "bugcrowdninja.com",
    signup: "https://customers.mattermost.com/cloud/signup",
    roles: [
      "Guest",
      "Member",
      "Channel Admin",
      "Team Admin",
      "Playbooks Admin",
      "System Admin",
      "User Manager",
      "System Manager",
      "Viewer",
      "Custom Groups Viewer",
    ],
    note: "Per-role permissions can be modified. Access-control reports are judged against the documented permissions.",
  },

  targets: [
    {
      name: "Mattermost Cloud, researcher-owned instance",
      location: "https://bugcrowd-*your-own-instance*.cloud.mattermost.com/",
      known_issues: 77,
    },
    {
      name: "Mattermost server and webapp",
      source: "https://github.com/mattermost/mattermost",
      install: "from source, or https://mattermost.com/download/",
    },
    { name: "Desktop apps", source: "https://github.com/mattermost/desktop", known_issues: 12 },
    {
      name: "Mobile Android",
      source: "https://github.com/mattermost/mattermost-mobile",
      known_issues: 1,
    },
    {
      name: "Mobile iOS",
      source: "https://github.com/mattermost/mattermost-mobile",
      known_issues: 0,
    },
    {
      name: "Jira plugin",
      source: "https://github.com/mattermost/mattermost-plugin-jira",
      known_issues: 4,
    },
    {
      name: "Zoom plugin",
      source: "https://github.com/mattermost/mattermost-plugin-zoom",
      known_issues: 3,
    },
    {
      name: "GitHub plugin",
      source: "https://github.com/mattermost/mattermost-plugin-github",
      known_issues: 4,
    },
    {
      name: "GitLab plugin",
      source: "https://github.com/mattermost/mattermost-plugin-gitlab",
      known_issues: 4,
    },
    {
      name: "Calls plugin",
      source: "https://github.com/mattermost/mattermost-plugin-calls",
      known_issues: 2,
    },
    {
      name: "Playbooks plugin",
      source: "https://github.com/mattermost/mattermost-plugin-playbooks",
      known_issues: 6,
    },
    {
      name: "Boards plugin",
      source: "https://github.com/mattermost/mattermost-plugin-boards",
      known_issues: 6,
    },
    {
      name: "Agents plugin, formerly Copilot",
      source: "https://github.com/mattermost/mattermost-plugin-agents",
      known_issues: 10,
    },
    {
      name: "Metrics plugin",
      source: "https://github.com/mattermost/mattermost-plugin-metrics",
      known_issues: 0,
    },
    {
      name: "Channel Export plugin",
      source: "https://github.com/mattermost/mattermost-plugin-channel-export",
      known_issues: 0,
    },
    {
      name: "Microsoft Calendar plugin",
      source: "https://github.com/mattermost/mattermost-plugin-mscalendar",
      known_issues: 1,
    },
    {
      name: "Microsoft Teams Meetings plugin",
      source: "https://github.com/mattermost/mattermost-plugin-msteams-meetings",
      known_issues: 0,
    },
    {
      name: "Confluence plugin",
      source: "https://github.com/mattermost/mattermost-plugin-confluence",
      known_issues: 3,
    },
  ],

  out_of_scope: [
    "about.mattermost.com",
    "integrations.mattermost.com",
    "docs.mattermost.com",
    "academy.mattermost.com",
    "developers.mattermost.com",
    "forum.mattermost.com",
    "mattermost.com",
    "Any Mattermost property not listed above, including every unlisted subdomain. Such reports are accepted but not paid.",
  ],

  // In scope, but never paid. Findings of these kinds are dropped before any review spends tokens.
  ineligible: [
    "Any violation of the program rules",
    "Brute force, for example guessing a password",
    "Disclosure of server or software version numbers",
    "SSRF that needs system admin privileges, except on a Cloud instance",
    "Phishing with Unicode homoglyphs or right-to-left override characters",
    "SPF, DKIM or DMARC issues, except on mattermost.com",
    "CSV or formula injection",
    "Attacks that need physical access to the victim's computer",
    "Adversary-in-the-middle attacks",
    "Distributed denial of service",
    "Content spoofing",
    "Social engineering, including phishing",
    "Email flooding",
    "XMLRPC issues",
    "Unconfirmed reports from automated vulnerability scanners",
    "Mobile issues that need a rooted or jailbroken device, debug access, or an operating system flaw",
    "Self-XSS without a reasonable attack scenario. Accepted with at most two steps, such as paste then preview",
    "Open redirects without further impact, such as stealing auth tokens",
    "Exploits that rely on outdated browsers",
    "Denial of service that affects only yourself",
    "Enterprise Edition unlock attacks, for example removing licence checks from the source",
    "System users holding scoped elevated permissions by default when a setting can restrict it",
    "Any finding a configuration option can mitigate",
    "Community plugins Mattermost does not support. Important ones are accepted as informational only",
  ],

  // Already known. The program closes these as not applicable.
  known_issues: [
    "Unauthenticated users can tell which email addresses have accounts",
    "Information disclosure across teams",
    "OAuth applications have no scopes and act as the user, including System Admin actions. In scope only when the action alters the delegation itself",
    "Public documents, such as the public Jira",
    "Hyperlink injection in emails sent to users",
    "System Admins may perform any action",
    "EXIF metadata is not stripped from images",
    "Race conditions that bypass a limit",
    "Remote code execution in GitHub Actions through workflow_dispatch, which needs repository write access",
    "Behavior from sysadmin-crafted requests that create unsupported permission states",
  ],

  n_day_policy: "A publicly released n-day is in scope 14 days after release.",

  automation: {
    unconfirmed_scanner_reports: "ineligible",
    excluded: ["Brute force", "Denial of service", "Email flooding"],
    note: "The brief sets no rate limit and no blanket ban on automation. Bugcrowd's platform behavior standards apply.",
  },

  ai_policy:
    "Not addressed in the brief. Bugcrowd's platform rules apply. The researcher is accountable for every submission.",

  // shuvuln's own stop, from the plan: pause after this many consecutive results that are not applicable or informational.
  submission_stop: { after_consecutive_not_applicable_or_informative: 3 },
} satisfies ProgramPolicy

export default mattermost
