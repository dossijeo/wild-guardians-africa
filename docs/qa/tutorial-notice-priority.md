# Tutorial and event notice priority

The currently displayed tutorial replaces a matching attack or defeat notice.
Replacement is remembered for that notice ID during the world session, so the
event card does not reappear when the tutorial closes. Exact source text and
explicit notice-ID association also identify matching explanations. Event
history and saves are not deleted or rewritten by presentation filtering.

Unrelated notices wait behind a visible tutorial; their fifteen-second lifetime
starts when they become visible. They retain manual dismissal. Notice history is
still bounded by the simulation's existing eight-message retention policy.

29 focused notice, tutorial, agricultural-announcement and player-UI checks pass,
including repeated UI refresh, tutorial dismissal, unrelated delayed events,
raid identity and same-text defeat notices. Actual UI and complete integration
checks remain part of the resumed acceptance work.
