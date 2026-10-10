# Control C1 — MVP rescue (P5 baseline)

This branch is a **separate rescue branch** from qualified P5 commit `66e8e147cd7e60280ef06d1537b1c23c439d2fb8`; it is not a continuation of P7–P17 release governance. Original P0 brief `docs/01-brief-and-journeys.md` and P0–P7 roadmap `docs/08-roadmap.md` remain authoritative.

## Working scope in C1

- Command elevates a single **recorded** next action, prioritizing owner-selected unblocked weekly focus, else explained deterministic rule-based ranked work. If no recorded action, ask the owner to define it. No AI-generated facts.
- Portfolio uses existing authenticated P2 target/phase read API and weight-based progress library instead of a permanent 'Unassessed' placeholder. Reported and verified completion are separate; unavailable API data is marked *unavailable* rather than fake zero.
- Project inspector and focus slots display truthful progress/phase context; successful milestone mutations refresh the parent overview.
- Phase form accepts an actual human phase title instead of silently writing the phase key as its title.
- GitHub Review adds an owner-authenticated, same-origin URL/name lookup for a **single GitHub repository** (public anonymously, private only with existing authorized GitHub App installation), validates canonical GitHub ID server-side and inserts into the existing candidate-review workflow; no automatic activation/release.
- Original JSON candidate bulk import remains under an advanced disclosure.
- No credentials or real private inventory added.

## Safety and limits

All writes still require session-derived owner and RLS-guarded server RPC; existing server-side max-three focus enforcement and evidence distinctions remain in force. Candidate resolution contacts only `api.github.com`, with constrained owner/repo syntax, no arbitrary URL or redirect following.

The repository is **public**, contrary to the P0 private-repository intent. Make an explicit owner decision before private portfolio import or production deployment. No actual production/Supabase migrations, authenticated two-user disposable integration, physical device QA, GitHub App authorization, merge or deployment occurred.

## Minimum C2/C3 path

1. Decide private repository vs explicitly safe public source, select an isolated authorized disposable Supabase project and configure test secrets **outside GitHub source**; run existing P1 two-user Auth/RLS/concurrent CAS validation before deploying any schema.
2. Run authenticated browser acceptance against that isolated disposable environment. Confirm real owner isolation, read/write, candidate lookup/link, progress refresh and focus (max 3). Do not replace actual auth checks with synthetic fixtures.
3. Connect a minimal read-only GitHub App if private repository lookup / evidence sync is desired; add private project inventory through the authenticated application, not through source commits.
4. Check desktop/mobile experience and accessibility with genuine owner review, remedy demonstrated defects, then request explicit authorization to deploy to a private staging/production environment.

No new cryptographic custody, signer, external witness or release governance phases are part of this MVP rescue.
