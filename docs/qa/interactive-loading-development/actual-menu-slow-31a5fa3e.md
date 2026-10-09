# Actual menu slow download cancellation — 31a5fa3e

Root executed the real menu with the existing scoped slow transport, then manually cancelled while a network request was still pending. Before cancellation: progress 0.723389, verified readiness false, approximately 45.95 MB loaded of 48.30 MB, pending downloads 1 and network-pending 1. Original asset bodies were unchanged; throttling belonged to the private QA transport.

The report closed with cancelled true and readiness false. After a further wait, root observed no world canvas or loading-cancel control, only the native menu iframe and no console errors. The tab was closed and browser inventory was empty. Before/active/after raw reports and the returned-menu picture are preserved. This functional observation does not certify audio ownership, physical peak RAM/VRAM, fully cached loading, or performance acceptance.
