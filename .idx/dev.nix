# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which channel to use.
  channel = "stable-24.05"; # Use stable channel

  # Use packages from the stable channel
  packages = [
    pkgs.nodejs_20
  ];

  # Sets environment variables in the workspace
  env = {};

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "dbaeumer.vscode-eslint"
    ];

    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        web = {
          # Use npm run dev and forward port/host dynamically assigned by Project IDX
          command = [
            "npm"
            "run"
            "dev"
            "--"
            "--port"
            "$PORT"
            "--host"
            "0.0.0.0"
          ];
          manager = "web";
        };
      };
    };

    # Workspace lifecycle hooks
    onCreate = {
      # Install dependencies automatically when the workspace is generated
      npm-install = "npm install";
    };
    onStart = {
      # This runs every time the workspace starts
    };
  };
}
