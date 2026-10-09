# Spirit voice files — offline technical audit

Runtime base `fccee67a`; no audio assets or gameplay were modified. All 54 original lab clips match their manifest byte counts and SHA-256 identities, contain one stereo Opus stream at 48 kHz with a positive duration, and decode completely through FFmpeg with `-xerror` and no error output. The report records exact tool/manifest hashes, binary versions and per-clip durations. These are container durations, not measurements of browser playback or speech intelligibility.

Reproduce with installed FFmpeg/ffprobe: `python tools/verify_spirit_media.py --output .cache/spirit-media-repeat.json`. Use `--ffmpeg` and `--ffprobe` for explicit executable paths. The tool does not transcode, preload or change the production audio bank, and is independent of default CI dependencies.

The successful result rules out truncated or undecodable files in this exact set. It does not close QA-156, prove mobile audibility/mixing, verify perceptual timing of all messages, or identify the original premature-close event sequence. Natural `ended`, hidden-page behavior and manual interruption still require their own lifecycle and physical evidence. No message duration is changed to a container timer; playback completion remains authoritative.
