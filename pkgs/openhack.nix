{pkgs}: let
  inherit (pkgs.lib) licenses meta optionalString optionals;
  version = "2.0.0";

  # Tag v2.0.0 is MIT. AGPL-3.0 applies only to commits after it.
  targets = {
    aarch64-darwin = {
      archive = "darwin-arm64";
      hash = "sha256-NfzasfqHkDjDNT0wawgjo5GmFRjcBViyG/Q5aZDszIo=";
    };
    aarch64-linux = {
      archive = "linux-arm64";
      hash = "sha256-WdoCm87e4nHmfBxib2YwUz5t4MPJxZ9v/pyW9yKCcjc=";
    };
    x86_64-linux = {
      archive = "linux-x64";
      hash = "sha256-YvAPMvIV/A+ncPnPJ2lBMGSP1JxCQH8KzRJ82Ky1a5M=";
    };
  };
  target =
    targets.${pkgs.stdenv.hostPlatform.system}
    or (throw "openhack has no verified archive for ${pkgs.stdenv.hostPlatform.system}");
in
  pkgs.stdenvNoCC.mkDerivation {
    pname = "openhack";
    inherit version;

    src = pkgs.fetchurl {
      url = "https://github.com/openhackai/OpenHack/releases/download/v${version}/openhack-${version}-${target.archive}.tar.gz";
      inherit (target) hash;
    };
    sourceRoot = "openhack-${version}-${target.archive}";

    # The Linux archive is a Bun executable linked against glibc.
    nativeBuildInputs = optionals pkgs.stdenv.hostPlatform.isLinux [pkgs.autoPatchelfHook];
    buildInputs = optionals pkgs.stdenv.hostPlatform.isLinux [pkgs.stdenv.cc.cc.lib];

    dontBuild = true;
    dontAutoPatchelf = true;

    installPhase = ''
      runHook preInstall
      install -Dm755 openhack $out/bin/openhack
      install -Dm644 LICENSE $out/share/openhack/LICENSE
      install -Dm644 THIRD_PARTY_NOTICES.md $out/share/openhack/THIRD_PARTY_NOTICES.md
      install -Dm644 DEPENDENCY-LICENSES.txt $out/share/openhack/DEPENDENCY-LICENSES.txt
      runHook postInstall
    '';

    preFixup = optionalString pkgs.stdenv.hostPlatform.isLinux ''
      autoPatchelf $out
    '';

    meta = {
      description = "Local AI security scanner for source code (MIT release)";
      longDescription = ''
        OpenHack reviews source read-only with advocate, skeptic and judge passes.
        This package wraps the standalone v2.0.0 release, the last MIT-licensed build.
      '';
      license = licenses.mit;
      mainProgram = "openhack";
      platforms = builtins.attrNames targets;
      sourceProvenance = [meta.sourceProvenance.binaryNativeCode];
    };
  }
