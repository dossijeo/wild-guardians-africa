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
raid identity and same-text defeat notices.

The browser fixture `tests/browser/tutorial-notice-priority.html` exercises the
real NativeGuardian panel and notice presenter. During the raid explanation,
neither event card is displayed. Closing the panel with its actual close button
reveals the unrelated weather card, without resurrecting the duplicate raid
alert. Both events remain in history and no browser errors were captured.
Screenshots and DOM reports are in `docs/qa/tutorial-notice-priority/`.
This is a controlled UI presentation check, not a complete campaign test.
