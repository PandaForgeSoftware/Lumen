# One Lumen across your devices

Keep the AI, memories and world on your home Windows PC. Your laptops, Samsung tablet and iPhone open that same world in a browser. The other devices do not need Ollama or a separate copy of Lumen.

## Setup prepared; not yet activated

1. Install [Tailscale for Windows](https://tailscale.com/download/windows) on the home PC and sign in with your personal account.
2. Start Lumen using `Open-Lumen.cmd`.
3. Run `Prepare-Remote-Access.ps1` in PowerShell in this folder. Complete Tailscale's HTTPS setup if it prompts you. This configures a private HTTPS service on port 8443, limited by the gateway to the account owning this PC in Tailscale.
4. Install Tailscale on each other device and sign into that same account. Open the HTTPS address printed by the script. Use browser bookmarks to return to it.

The home PC must be on, signed in and awake. Startup happens at Windows sign-in. Phones and tablets use the existing on-screen movement controls. A work laptop may require your employer's permission to install Tailscale.

## What is shared

All clients see the same saved world, conversations, projects and helper results because they talk to the same home worker. Camera positions are separate for each browser. GitHub continues to receive public project snapshots; it is not the memory database.

## Access controls

This uses **Tailscale Serve**, not public Funnel. The gateway binds only to `127.0.0.1:4319`, and the app stays at `127.0.0.1:4317`. Only Serve's configured account identity is accepted. Requests with missing or different identity, unknown hosts, or cross-site origins are rejected. The gateway trusts Tailscale's identity headers only because its listener is local; local software on the home PC is already trusted. Do not forward either port through your router or expose the app with another proxy.

Tailscale requires its own account connection and may require HTTPS to be enabled. Its certificate may list your device's DNS name publicly; app contents remain private. Tagged devices do not carry a user identity and are deliberately rejected. The setup refuses to replace an existing Serve service on port 8443.

The private account configuration is in ignored `data/remote-access.json`. It is not committed to GitHub. `Watch-Lumen.ps1` restarts the gateway when enabled; an already running older supervisor picks up this upgrade at the next Windows sign-in.

## Turn it off

Run `Disable-Remote-Access.ps1`. It disables gateway access first, then removes the Serve service on port 8443. Local Lumen continues running.

## Verification on a second device

Open the printed address while Tailscale is connected; confirm the same project list is visible. Send a short message and confirm it appears on the home PC. Disconnect Tailscale and confirm the address no longer opens. These checks still need to be performed on an actual second device after setup.

Reference: [Tailscale Serve and identity headers](https://tailscale.com/docs/features/tailscale-serve).
