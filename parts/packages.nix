{
  inputs,
  self,
  ...
}: {
  perSystem = {
    pkgs,
    system,
    ...
  }: let
    inherit (pkgs.lib) getExe;
    openhack = import ../pkgs/openhack.nix {inherit pkgs;};
    pi = import ../pkgs/pi.nix {
      inherit pkgs;
      upstream = inputs.llm-agents.packages.${system}.pi;
    };
    shuvuln = pkgs.writeShellApplication {
      name = "shuvuln";
      runtimeInputs = [pkgs.nodejs pi openhack];
      text = ''
        export SHUVULN_PI=${getExe pi}
        exec ${getExe pkgs.nodejs} ${self}/src/cli.ts "$@"
      '';
    };
  in {
    packages = {
      inherit openhack pi shuvuln;
      default = shuvuln;
    };
  };
}
