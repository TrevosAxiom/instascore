# Milestone 14 Readiness Checklist

Milestone 13 is ready to hand off for Milestone 14 after approval when the following are accepted:

- Fantasy scoring-rule tables exist and migrate at database version `11`.
- Fantasy point rows can distinguish provisional and confirmed states.
- Point revision history exists for recalculation and administrator override workflows.
- Transfers are recorded append-only with server-side deadline and cost checks.
- Public/private league foundations and rank movement are in place.
- Fantasy points, live tracker, transfer market and league screens are routable.
- REST permissions distinguish authenticated fantasy actions from protected administrator actions.
- Frontend linting, type checking, tests and production build pass.

Recommended Milestone 14 focus:

- Complete the deterministic fantasy recalculation worker.
- Wire match-event correction hooks into fantasy point recalculation end-to-end.
- Complete invite-code join flow and invite-attempt rate limiting.
- Tighten squad-scoped privacy for point breakdowns.
- Expand anti-abuse controls for leagues and transfer activity.
- Add richer fantasy notification queue dispatch for meaningful rank and point changes.
