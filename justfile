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

# Send one tiny prompt through the model gateway.
ping model="zai/glm-5.4":
  node src/cli.ts gateway ping --model "{{model}}"
