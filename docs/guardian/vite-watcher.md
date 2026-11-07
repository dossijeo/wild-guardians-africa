# Development server watcher

On the local Windows checkout, a newly started Vite process announced readiness but did not answer HTTP within eight seconds while its watcher indexed roughly 75,000 handles and consumed over 1 GB. The checkout contained approximately 40,004 files in `docs` and 28,555 in `.cache`.

Excluding `docs`, `.cache`, and `.codex-attachments` from the watcher produced an HTTP response for `/` in 69 ms and a source module in 415 ms in a comparable local check. HTTP requests for a document fixture and a cache file still returned 200, and a temporary change in `src` produced a Vite WebSocket reload. This is a development-server startup observation, not a game frame-time measurement. Files in excluded folders remain served but changes there no longer trigger automatic reload.
