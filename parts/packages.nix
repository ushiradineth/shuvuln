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
    openhack-pi = import ../pkgs/openhack-pi.nix {
      inherit pkgs;
      patch = ../patches/openhack-pi-provider.patch;
    };
    pi = import ../pkgs/pi.nix {
      inherit pkgs;
      upstream = inputs.llm-agents.packages.${system}.pi;
    };
    shuvuln = pkgs.writeShellApplication {
      name = "shuvuln";
      runtimeInputs = [pkgs.nodejs pi openhack openhack-pi];
      text = ''
        export SHUVULN_PI=${getExe pi}
        export NODE_EXTRA_CA_CERTS=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
        exec ${getExe pkgs.nodejs} ${self}/src/cli.ts "$@"
      '';
    };
  in {
    packages = {
      inherit openhack openhack-pi pi shuvuln;
      default = shuvuln;
    };
  };
}
