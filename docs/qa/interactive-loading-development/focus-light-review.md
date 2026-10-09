# Soft crop focus: visual review scope

Source: `eac5184b`, following the explicit request to preserve the approved V9 composition and add only a soft central focus with gradually darker surroundings.

The focus is implemented in the existing local crop/soil material fragment hooks and the existing sky-haze draw. Shared world materials and sky textures are not modified. The centre follows the actual camera projection of the crop focus. Uniforms use the actual drawing-buffer size; presentation looking upwards fades the amount. There is no additional target, pass, light, texture or per-plant frame loop.

Four focus-enabled native screenshots were captured at controlled QA growth 78%, with reduced motion and Spanish UI, at 1280x720 and 420x900. This controlled slider is a presentation fixture and is not evidence of production loading progress. Four initial plants remain present. The portrait drawing buffer was observed at 420x900 before capture. Native Cancel completed and the report records zero renderer geometries/textures/programs after disposal.

Two pre-existing `f_environment4` program-info warnings were retained in `focus-on-console.json`; no fatal shader error was observed. These warnings must not be summarized as an empty console. A cache-key contract initially failed because the native default key reads the current compile hook. The key is now captured before wrapping the hook; the original failed contract is retained separately.

The same-source `no-focus` fixture is a visual control only: it supplies amount zero to the same compiled shader code. It cannot measure the overhead of adding the shader instructions. Any incremental cost comparison must use the immutable pre-focus V9 source versus this source, with equal pose, growth, aspect and resource conditions. The eight earlier V6/V9 timing arms predate this focus and cannot be used as its performance proof.

The same-source control completed all four captures. Both owners retained four plants and disposed to zero renderer geometries/textures/programs. Focus-on retains two native environment shader warnings; the control console is empty. Neither owner reports a fatal error. This single pair does not establish that the focus caused those existing environment warnings. The paired landscape images show a gradual darkening at the edges while the crops and UI remain legible; the composition and UI are unchanged. Reduced-motion fixes the paired pose. The portrait drawing buffer was observed at 420x900 in both owners. Tab 205 and tab 204 are closed and the viewport override reset.

Pending: incremental cost measurement and full application cinematic/handoff validation. Original readiness-time regression and full release gates remain open; this visual block does not approve a PR.
