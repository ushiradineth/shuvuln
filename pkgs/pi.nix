{
  pkgs,
  upstream,
}: let
  inherit (pkgs.lib) getExe;
in
  # shuvuln's Pi is separate from any other Pi on the machine: its own binary and its own
  # agent directory, which holds the z.ai and OpenAI logins and nothing else.
  pkgs.writeShellApplication {
    name = "pi";
    runtimeInputs = [pkgs.coreutils];
    text = ''
      export PI_CODING_AGENT_DIR="''${SHUVULN_PI_AGENT_DIR:-''${SHUVULN_HOME:-$HOME/.local/share/shuvuln}/pi-agent}"
      export PI_SKIP_VERSION_CHECK=1
      export PI_TELEMETRY=0
      mkdir -p "$PI_CODING_AGENT_DIR"
      chmod 700 "$PI_CODING_AGENT_DIR"
      exec ${getExe upstream} "$@"
    '';
  }
