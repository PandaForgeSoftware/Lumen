# Install Lumen on Windows

1. [Download Lumen](https://github.com/PandaForgeSoftware/Lumen/archive/refs/heads/main.zip).
2. Right-click the downloaded ZIP and choose **Extract All**.
3. Open the extracted folder and double-click **Install-Lumen.cmd**. Keep the adjacent `Install-Lumen.ps1` file with it.

Choose one option in the setup window:

## Install a new Lumen on this PC

Setup checks for Git, Node.js 24+ and Ollama, offers missing dependencies through Windows Package Manager, downloads Lumen into your local application folder, installs its components and AI model, enables hidden startup at sign-in and creates a desktop shortcut. Review any Windows installation or license prompts. The AI model is a several-GB download; its progress is shown in the setup window.

Setup checks that the world responds before opening it. The AI runtime may take additional time to become ready. Run `Connect-GitHub.ps1` in the installed folder for the one-time GitHub login if you want this new instance to upload. Setup does not copy memories from another computer. Avoid running multiple independent instances that upload to the same GitHub branch simultaneously.

If Lumen is already running on this PC, setup opens that world instead of installing another copy. An interrupted install can be rerun; an existing Lumen checkout is reused without replacing its code or memories. Unknown existing folders are left untouched. This is a guided script installer, not a signed MSI or EXE.

## Connect to the same Lumen on your home PC

Recommended for additional laptops. Complete [remote setup](REMOTE-ACCESS.md) on the home PC first. Paste the private HTTPS address it gives you. Setup checks/installs Tailscale, starts its sign-in flow, and creates a desktop link to your existing Lumen. Use the same Tailscale account as the home PC. The home PC must remain on and awake.

For iPhone and Samsung tablets, install the Tailscale app, sign into that account and open the same private address in your browser; this Windows installer is not needed.

## If setup stops

Read the error left in its window. If a dependency was installed but cannot be found yet, close setup and rerun it. Windows Package Manager is supplied by Microsoft's App Installer; install or update App Installer if it is missing. Managed work computers may require IT approval. Setup does not bypass organizational controls or Windows security warnings.

Read-only diagnostics: run `Install-Lumen.ps1 -CheckOnly` from PowerShell. This checks available tools without installing software or changing files.

Validation so far: Windows PowerShell syntax and read-only diagnostics on the development PC. A fresh-machine dependency installation and an actual second-device connection still require testing.
