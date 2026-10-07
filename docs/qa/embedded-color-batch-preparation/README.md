# Remaining embedded color batch prepared

The current twenty runtime GLBs contain 63 embedded images. All original/runtime model hashes match their manifest records, and every image has identical original/runtime consumer references and classifications. Five reviewed Tinify color outputs are already installed byte-exact from their offline recipes: warthog, hyena, buffalo, lion and rhino. This supersedes the older one-beast pending note without changing its historical evidence.

The remaining **16 exclusively color images** now have lossless PNG upload inputs prepared from original source pixels at unchanged runtime dimensions. Their original images, model hashes, consumer references, runtime images, upload hashes and dimensions are recorded in `plan.json`. Their current encoded runtime images total 13,405,418 bytes. The 127,501,014 bytes of intermediate PNGs remain under ignored `.cache/embedded-colors-remaining/`, outside public assets and the distribution. They are preparation inputs, not proposed additions to the game.

The other **42 normal/data images** are explicitly kept for exact-data review. They must not be submitted through a lossy color policy merely to convert every image.

Thirty directed preparation, recipe, independent decoded-candidate, container-repacking and role-classification tests pass (`tests.tap`). The actual batch completed with exit 0. No API key or provider request was used. No new optimized image is installed, and no package saving, RAM/GPU/frametime improvement or visual/mobile acceptance is claimed.

Reproduce: `node tools/prepare_remaining_embedded_colors.mjs .cache/embedded-colors-remaining`. The command accepts only an output directory beneath the workspace's ignored cache; manifest-owned source paths and hashes are checked before preparing inputs. Tinify conversion, independent decoded gates, native visual review and offline runtime recipes remain the next steps for these sixteen images.
