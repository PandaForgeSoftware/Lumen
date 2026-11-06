# Lumen

A local AI companion with a persistent, explorable 3D world. Runs independently of ChatGPT or Codex on a Windows home PC. This is an early working foundation, not a general-purpose computer operator.

## Open your world

Run **Open-Lumen.cmd**, then visit **http://127.0.0.1:4317**. Explore through a camera with WASD, drag to look, hold Shift to move faster and press E to interact. There is no visitor avatar. Use the Map to walk automatically to a destination. Enter the library through its open doorway and read physical book spines or use the reading table. Enter the workshop to use its project board and workbench. The cottage contains Lumen’s journal. Approach Lumen to talk, or press T. The musical-note button enables spoken replies using your browser's voice service.

Lumen chooses a small creative task every ten minutes while creation is enabled. Closing the browser tab does not stop the background app. Turning off the PC stops its work. Windows startup runs at sign-in, not before sign-in. Failed or interrupted requests remain in the journal; they are not silently marked completed.

## Setup on another Windows PC

Requires Node.js 24+, Git and Ollama. In this folder:

```powershell
npm ci
ollama pull qwen3:4b-instruct-2507-q4_K_M
ollama create lumen-local -f Modelfile
.\Start-Lumen.ps1
```

Run `Install-Autostart.ps1` to add a Windows Startup shortcut. Remove the `Lumen` shortcut from Windows' Startup folder to disable sign-in startup. To stop Lumen completely, stop the Node process running this folder's `app-server.mjs` and its Eve child runtime. Pausing creation in the app leaves chat available.

## What it can do today

- Generate and save composite 3D designs, including structures, gardens, sculptures, paths and decorative companions.
- Choose creative projects on a local timer and report actual completed creations.
- Chat through a separate local Qwen model served by Ollama, using the Eve agent framework.
- Store world objects, project records, preferences, source excerpts and activity in SQLite.
- Research introductory Wikipedia sources and place the retrieved excerpts and links in the library. This is not yet comprehensive multi-source research.
- Publish world design snapshots to the designated GitHub repository when Git authentication is available.

## Still to build

The visitor has wall and furniture collisions, enterable interiors and actual saved books on shelves. Lumen’s character walks to locations indicated by real tool activity; walking animations run while the world is open, while the AI can work with the browser closed. Pip’s behaviour is decorative.

Microphone input, authenticated remote access from phones/tablets/other computers, device task routing, general desktop control, editing other projects, and tested self-modification are not implemented. Pets are animated virtual characters, not separate intelligent agents. Learning currently means saved preferences and notes, not retraining the model or developing consciousness.

## Data and GitHub

Lumen's model, worker and world run locally without ChatGPT. Once connected to GitHub, background uploads use Windows' saved credential and never ask a chat service to publish. Run `Connect-GitHub.ps1` once and sign into **PandaForgeSoftware**. GitHub requires this initial authorization; anonymous uploads are not supported. The script verifies repository access before enabling automatic snapshots.

Lumen can use `build_building` to create furnished, enterable rooms with clear doorways. Generated floors are walkable and roofs hide while the visitor is inside.

The configured repository is public: https://github.com/PandaForgeSoftware/Lumen.

`data/` and `.eve/` contain private local state and are ignored by Git. Never commit these folders. Snapshots include autonomous designs, their project descriptions, and creative task status. Treat these design names and descriptions as public. Owner-requested objects are excluded from automatic snapshots. Conversations, memory records, research excerpts and runtime logs are not exported. GitHub is version history, not the cross-device database. Back up `data/` separately with the app stopped. The UI is bound to loopback; do not expose either local port to the internet without adding authentication and a secure transport.

The app is on port 4317, the Eve runtime on 4318, and Ollama on 11434. The current launcher uses Eve's local development runtime with the optional default tools and extensions disabled. This requires no cloud AI account. Dependencies and source should be updated by a person until a tested update-and-rollback mechanism exists.

## Development

`npm start` runs the local server. `npm test` verifies persistence and world write controls. Agent tools live in `agent/tools/`; their actual operations and validation live in `lib/actions.mjs`. Model configuration is in `agent/agent.ts` and `Modelfile`. The Three.js scene reads the same stored objects that the model creates.
