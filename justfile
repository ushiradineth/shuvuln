# List all commands.
default:
  @just --list

# Format every file the tree covers.
fmt:
  nix fmt

# Run every flake check: hooks, types, unit tests and package builds.
check:
  nix flake check

# Type-check without emitting.
typecheck:
  tsc --noEmit

# Run the unit tests.
test:
  node --test "src/**/*.test.ts"

# Install the TypeScript dev dependencies once.
install:
  pnpm install --frozen-lockfile

# Show whether shuvuln's own Pi can reach z.ai and OpenAI.
auth-status:
  node src/cli.ts auth status

# Open shuvuln's own Pi so you can run /login for z.ai and OpenAI.
auth-login:
  node src/cli.ts auth login

# Send one tiny prompt through the model gateway. With no model it uses a z.ai stage model.
ping model="":
  node src/cli.ts gateway ping {{model}}

# Run OpenHack on the smoke fixture, through shuvuln's own Pi, on OpenAI. Costs plan usage.
smoke workers="2" steps="4":
  node src/cli.ts hunt scan fixtures/notes-app --workers {{workers}} --steps {{steps}}

# Store a token where only you can read it. It is typed hidden and never printed back.
secret-set name="hexbrain":
  node src/cli.ts secret set {{name}}

# Say which secrets exist.
secrets:
  node src/cli.ts secret status
