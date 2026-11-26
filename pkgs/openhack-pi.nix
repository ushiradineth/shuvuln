{
  pkgs,
  patch,
}: let
  # The last MIT-licensed commit of OpenHack: tag v2.0.0 plus one harness fix. AGPL starts after it.
  # The patch adds a `pi` provider, so the scanner reaches models only through shuvuln's own Pi.
  src = pkgs.applyPatches {
    name = "openhack-pi-source";
    src = pkgs.fetchFromGitHub {
      owner = "openhackai";
      repo = "OpenHack";
      rev = "fc9d444f2712d1f233904b3eb27bbcec4fbbf224";
      hash = "sha256-EEy0zUlHRZutDwSgEpQSRKdpruzWdjSwOxTQmoZ4k+E=";
    };
    patches = [patch];
  };
in
  pkgs.writeShellApplication {
    name = "openhack-pi";
    runtimeInputs = [pkgs.bun pkgs.coreutils];
    text = ''
      # OpenHack from the patched MIT source, run with Bun. On first use Bun installs the
      # dependencies named in the committed lockfile and verifies each against it.
      work="''${SHUVULN_HOME:-$HOME/.local/share/shuvuln}/openhack/pi"
      export OPENHACK_HOME="''${SHUVULN_HOME:-$HOME/.local/share/shuvuln}/openhack/home"
      mkdir -p "$OPENHACK_HOME"
      if [ "$(cat "$work/.source" 2>/dev/null)" != "${src}" ]; then
        rm -rf "''${work:?}"
        mkdir -p "$work"
        cp -R "${src}/." "$work/"
        chmod -R u+w "$work"
        # Its output goes to stderr so a --json report stays pure JSON.
        (cd "$work" && bun install --frozen-lockfile >&2)
        printf '%s' "${src}" > "$work/.source"
      fi
      exec bun "$work/src/cli/index.ts" "$@"
    '';
  }
