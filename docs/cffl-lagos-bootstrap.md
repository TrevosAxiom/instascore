# CFFL Lagos bootstrap

This workspace bootstrap creates the real CFFL Lagos league structure inside InstaScore.

It intentionally does not claim that placeholder team names, generated team logos or draft rules are official league data. Those fields are marked as pending verification so league operators can replace them with verified assets and the official rulebook before public launch.

## Admin action

Admin Settings includes a `Bootstrap CFFL Lagos` action.

The action creates or reuses:

- Sport: Flag Football
- Competition: CFFL Lagos
- Season: 2026 Season
- Venue: CFFL Lagos Primary Field
- Starter team records with generated placeholder SVG logos
- Week 1 starter fixtures
- Role accounts:
  - `cffl_admin`
  - `cffl_scorekeeper`
  - `cffl_team_admin`

Existing records are reused by slug or username, so the action is safe to run more than once.

## Rules status

The seeded competition rules are a safe starting structure only:

- 7-on-7 flag-football foundation
- Touchdown: 6
- Safety: 2
- One-point conversion: 1
- Two-point conversion: 2
- Win/draw/loss standings points: 3/1/0
- Tiebreaker foundation: points, point difference, points for, head-to-head foundation

Items still requiring official CFFL Lagos confirmation:

- Complete rulebook
- Field dimensions
- Clock policy
- Timeout policy
- Contact/blocking standards
- Overtime format
- Official teams
- Official team logos
- Official venues
- Official schedule

## Provider settings

Admin Settings also contains secure provider configuration for football and basketball:

- Provider base URL
- Server-side API key entry
- Poll-live-scores toggle
- Live polling interval
- Manual `Poll live scores now` actions

Saved API keys are not returned to the browser. The UI only receives `apiKeyConfigured`.

Provider polling uses the existing normalized provider sync pipeline, so imported matches and scores should be written through provider mappings and sync logs rather than raw provider response structures.
