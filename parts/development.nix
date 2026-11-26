{
  inputs,
  self,
  ...
}: {
  imports = [inputs.treefmt-nix.flakeModule];

  perSystem = {
    config,
    lib,
    pkgs,
    self',
    system,
    ...
  }: let
    nodeTypes = import ../lib/node-types.nix {inherit pkgs;};
    preCommitCheck = inputs.pre-commit-hooks.lib.${system}.run {
      src = ../.;
      hooks = {
        alejandra.enable = true;
        prettier = {
          enable = true;
          package = pkgs.prettier;
          # A lockfile belongs to the tool that writes it.
          excludes = ["pnpm-lock.yaml"];
          settings = {
            write = true;
            configPath = "./.prettierrc.yaml";
          };
        };
        deadnix.enable = true;
        statix.enable = true;
        typos = {
          enable = true;
          settings = {
            # The upstream default leaves an empty table that overrides configPath.
            config = lib.mkForce {};
            configPath = ".typos.toml";
            write = true;
          };
        };
        gitleaks.enable = true;
      };
    };

    # Nix checks run the TypeScript with the pinned compiler and no package-manager install.
    typescriptCheck = name: command:
      pkgs.runCommand name {
        nativeBuildInputs = [pkgs.nodejs pkgs.typescript];
        src = self;
      } ''
        cp -r "$src" "$TMPDIR/shuvuln"
        cd "$TMPDIR/shuvuln"
        export HOME="$TMPDIR/home"
        mkdir -p "$HOME"
        ${command}
        touch "$out"
      '';
  in {
    treefmt = {
      projectRootFile = "flake.nix";
      programs = {
        alejandra.enable = true;
        prettier = {
          enable = true;
          package = pkgs.prettier;
          includes = ["*.json" "*.ts" "*.md" "*.yaml" "*.yml"];
          excludes = ["flake.lock" "pnpm-lock.yaml"];
        };
        deadnix.enable = true;
        statix.enable = true;
        typos = {
          enable = true;
          configFile = ".typos.toml";
        };
      };
    };

    formatter = config.treefmt.build.wrapper;

    checks = {
      pre-commit-check = preCommitCheck;
      typecheck = typescriptCheck "shuvuln-typecheck" ''
        tsc --noEmit --project tsconfig.json --typeRoots "${nodeTypes}"
      '';
      unit = typescriptCheck "shuvuln-unit" ''
        node --test "src/**/*.test.ts"
      '';
    };

    devShells.default = pkgs.mkShell {
      name = "shuvuln";
      packages = [
        pkgs.bun
        pkgs.nodejs
        pkgs.pnpm
        pkgs.typescript
        pkgs.git
        pkgs.gh
        pkgs.jq
        pkgs.yq
        pkgs.gitleaks
        pkgs.just
        config.treefmt.build.wrapper
        self'.packages.openhack
        self'.packages.openhack-pi
        self'.packages.pi
      ];
      shellHook = ''
        ${preCommitCheck.shellHook}
        export SHUVULN_HOME="''${SHUVULN_HOME:-$HOME/.local/share/shuvuln}"
        export SHUVULN_PI=${self'.packages.pi}/bin/pi
        export SHUVULN_OPENHACK=${self'.packages.openhack-pi}/bin/openhack-pi
        export NODE_EXTRA_CA_CERTS=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
      '';
    };
  };
}
