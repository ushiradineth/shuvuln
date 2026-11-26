import type { ProgramPolicy } from "../src/program/policy.ts"

// Engagement policy for one bug bounty program. Nothing in shuvuln works on a program until this
// file names who approved it. Drafted on 2026-11-26 from the public YesWeHack program API, which
// returns the brief, the scopes and the reward grids. Approved by Shu on 2026-11-26.
const infomaniak = {
  program: "infomaniak",
  platform: "yeswehack",
  brief: "https://yeswehack.com/programs/infomaniak-bug-bounty-program",
  brief_last_updated: "2026-11-20",
  approved_by: "shu",
  approved_on: "2026-11-26",

  // v1 proves findings in a local lab only. The brief forbids traffic-heavy automation on live assets.
  live_testing: "unapproved",
  local_installation: "allowed",

  safe_harbor: "Not stated in the brief. YesWeHack's platform terms apply.",
  identity_verification_required: false,
  disclosure: "None. Full or partial disclosure is not allowed.",
  rating: "YesWeHack's low, medium, high, critical, priced per asset value",

  // For an asset rated critical value, such as desktop-kDrive. A high-value asset pays
  // 100, 400, 1500 and 3500; a medium-value asset 100, 300, 600 and 1000.
  rewards_usd: { low: 100, medium: 600, high: 2000, critical: 7000 },

  accounts: {
    email_domain: "",
    signup: "https://www.infomaniak.com/en/signup",
    roles: ["kDrive, kChat and kMeet account holders"],
    note: "The brief says nothing about test accounts. Create your own.",
  },

  // 58 scopes in all. The five with public source are here; the 53 live web and API scopes are
  // for live testing only, which v1 does not do.
  targets: [
    {
      name: "kDrive desktop app",
      source: "https://github.com/Infomaniak/desktop-kDrive",
    },
    { name: "kChat desktop app", source: "https://github.com/Infomaniak/desktop-kChat" },
    {
      name: "kMeet desktop app",
      source: "https://github.com/Infomaniak/desktop-kMeet",
    },
    {
      name: "kMeet Android app",
      source: "https://github.com/Infomaniak/android-infomaniak-meet",
    },
    {
      name: "kMeet iOS app",
      source: "https://github.com/Infomaniak/ios-infomaniak-meet",
    },
  ],

  out_of_scope: [
    "Any asset not listed as in scope",
    "The Open Stack dashboard",
    "ov-XX.infomaniak.ch and od-XX.infomaniak.ch subdomains",
    "https://drive.infomaniak.com/app/office/, an external office application",
  ],

  // Not qualifying, from the brief.
  ineligible: [
    "The Infomaniak mirror server",
    "HTML injection in emails",
    "Sandboxed XSS without a working proof",
    "Tabnabbing",
    "Missing cookie flags",
    "Content and text injections",
    "Mixed content warnings",
    "Clickjacking and UI redressing",
    "Denial of service",
    "Known CVEs without a working proof",
    "Open ports without real security impact",
    "Social engineering of staff or contractors",
    "The autocomplete attribute on web forms",
    "Vulnerabilities in outdated browsers or platforms",
    "Self-XSS, or XSS that cannot affect other users",
    "Outdated libraries without demonstrated impact",
    "Hypothetical flaws and best practice advice without an exploitable proof",
    "Expired certificates and other TLS best practice",
    "Unexploitable findings, such as XSS or an open redirect in the Host header",
    "Reports that need a man in the middle",
  ],

  // Already known: the program shows 4,887 reports and pays by "one fix, one reward".
  known_issues: [
    "The program lists no known issues. Check the hall of fame and existing reports before submitting.",
  ],

  automation: {
    unconfirmed_scanner_reports: "not qualifying without a working proof",
    excluded: [
      "Denial of service",
      "Automated scanners or tools that generate large amounts of network traffic",
      "Tests that could degrade or interrupt the service",
    ],
    note: "No request may touch a live asset without its own approval. Static review of the public source makes none.",
  },

  ai_policy:
    "Not addressed for reports. Manipulating the AI model so that other users are affected is a qualifying vulnerability.",

  submission_stop: { after_consecutive_not_applicable_or_informative: 3 },
} satisfies ProgramPolicy

export default infomaniak
