# Prototype and logo audit

## Source

`docs/reference/instascore-mobile-ui-recreated.html` is the visual source of
truth. It contains 22 device mockups and the same embedded PNG logo twice. The
PNG is extracted as `docs/reference/instascore-logo.png`.

## Visual language

- Deep navy canvas and surfaces, rich gold actions/live state, warm cream
  foregrounds, slate-blue secondary text and restricted red alerts.
- Dark and light token sets; rounded cards and controls; high-contrast,
  tabular score typography; dense mobile-first composition.
- Sticky five-item mobile navigation, compact top bars, pills/segments, team
  crests, score cards, timelines, data tables, dashboards and form controls.
- Layout starts at 320px; larger pages should constrain content rather than
  merely scale the phone mockups.

## Accessibility implications

Emoji and colour cannot be the only state indicators. Gold-on-cream and muted
text combinations need contrast validation. Touch targets should be at least
44px, live changes need non-disruptive announcements, tables need headers and
captions, and motion must respect reduced-motion preferences.

## Implementation rule

Recreate the language with semantic Material UI tokens and small components;
do not import the prototype CSS or render it as one component. Screen contents
represent future scope and are inventory only in Milestone 0.
