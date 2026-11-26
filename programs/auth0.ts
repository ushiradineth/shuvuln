import type { ProgramPolicy } from "../src/program/policy.ts"

// Engagement policy for one bug bounty program. Nothing in shuvuln works on a program until this
// file names who approved it. Written on 2026-11-26 from the brief Shu pasted after signing in.
// Not approved yet: approved_by is empty.
const auth0 = {
  program: "auth0",
  platform: "bugcrowd",
  brief: "https://bugcrowd.com/engagements/auth0-okta",
  brief_last_updated: "2026-10-05",
  approved_by: "",
  approved_on: "",

  // v1 proves findings in a local lab only. The brief bans automated tools on Auth0 systems
  // outright, so no request from shuvuln may ever reach one.
  live_testing: "unapproved",
  local_installation: "allowed",

  safe_harbor: "full",
  identity_verification_required: true,
  disclosure: "None. Information about vulnerabilities may not be released to the public.",
  rating:
    "Bugcrowd Vulnerability Rating Taxonomy, at Okta's discretion. Tier 1 targets pay P1 $10,000 to $50,000, P2 $4,000 to $10,000, P3 $1,000 to $4,000, P4 $100 to $1,000. SDK and tier 2 targets pay P1 $5,000 to $15,000, P2 $2,000 to $5,000, P3 $500 to $2,000, P4 $100 to $500.",

  // The low end of the SDK ranges, which are the targets with public source.
  rewards_usd: { P1: 5000, P2: 2000, P3: 500, P4: 100 },
  average_payout_usd_last_3_months: 9391,
  vulnerabilities_rewarded: 128,
  triage: { validation_within_days: 15, percent_decided_within_10_days: 0 },

  accounts: {
    email_domain: "",
    signup: "https://manage.cic-bug-bounty.auth0app.com/",
    roles: ["Tenant member", "Tenant admin", "Three researcher users, each with a tenant"],
    note: "Credentials come from the program page under Get Credentials. The researcher tenant is for testing only, holds no personal data, and may be deleted at any time.",
  },

  targets: [
    { name: "Auth0 SDK for Web", source: "https://github.com/auth0/auth0.js" },
    { name: "Lock for Web", source: "https://github.com/auth0/lock" },
    { name: "Single Page App SDK", source: "https://github.com/auth0/auth0-spa-js" },
    { name: ".NET SDK", source: "https://github.com/auth0/Auth0.Net" },
    { name: "Next.js SDK", source: "https://github.com/auth0/nextjs-auth0" },
    { name: "Java SDK", source: "https://github.com/auth0/auth0-java" },
    { name: "React Native SDK", source: "https://github.com/auth0/react-native-auth0" },
    { name: "PHP SDK", source: "https://github.com/auth0/auth0-php" },
  ],

  out_of_scope: [
    "auth0.auth0.com, manage.auth0.com, accounts.auth0.com",
    "Auth0 documentation, quickstarts, support and community",
    "phenix.rocks, sharelock.io, goextend.io",
    "Auth0 passport-wsfed-saml2",
    "Every Auth0 environment other than the researcher tenant",
    "Customer data and customer instances",
  ],

  ineligible: [
    "Subdomain takeovers",
    "GitHub Actions vulnerabilities, paid as duplicates without a bounty",
    "Reporting an issue already submitted to the private program, which brings a permanent ban",
    "Abandoned domains, domain squatting, link rot, social media hijacking",
    "XSS in the customised login page",
    "Race conditions that bypass limits",
    "Session invalidation on password change or reset",
    "Incomplete proofs of concept and theoretical issues: a complete proof is mandatory",
    "Host header redirects without user impact",
    "Non-200 pages, fingerprinting and banner disclosure",
    "Disclosure of known public files",
    "Clickjacking",
    "CSRF on anonymous forms and logout CSRF",
    "Autocomplete and save-password features",
    "Missing security speedbump, captchas, brute force and lockout on login pages",
    "HTTP methods enabled",
    "Web server type disclosures",
    "Social engineering and physical attacks",
    "Needing the user's physical device",
    "Error messages with non-sensitive data",
    "Non-application denial of service",
    "Cookie flags, multiple cookies, JSESSIONID",
    "Service rate limiting",
    "User or organisation enumeration",
    "Security images",
    "Business logic issues that only read, such as seeing a list of application names",
    "Missing HTTP security headers",
    "SPF, DMARC and DKIM findings",
    "Email rate limiting, DNSSEC, CSV issues, antivirus scanning, SSL issues",
    "SDK findings that rely on unintended use of the SDK, on individual functions not reachable from an application built with the SDK, or on improperly validated input, since applications must validate input and treat it as untrusted",
    "Intentionally insecure implementations that do not follow Auth0's documentation",
    "Publicly known zero-days, until 30 days after a patch",
  ],

  known_issues: [
    "Auth0 has run a private program since 2019. Anything found there is a duplicate.",
    "Similar bugs with one root cause from one researcher are combined into a single award.",
  ],

  n_day_policy:
    "A public zero-day is ineligible until more than 30 days have passed since the patch.",

  automation: {
    unconfirmed_scanner_reports: "banned",
    excluded: [
      "Any automated tool or scanner",
      "Burp scans",
      "Denial of service",
      "Pivoting after access",
    ],
    note: "Any use of automated scanning tools or denial of service brings an immediate ban. Burp Intruder may not exceed 5 requests per second. Static review of the public SDK source makes no request. After access to a server, stop and report.",
  },

  // The brief's own words: reports with low-effort or AI-generated content are rejected, and
  // repeat offenders are removed. shuvuln may find and prove; Shu writes every report himself.
  ai_policy:
    "Reports containing low-effort or AI-generated content are rejected; submissions must show original analysis, and repeat offenders are removed from the program.",

  submission_stop: { after_consecutive_not_applicable_or_informative: 3 },
} satisfies ProgramPolicy

export default auth0
