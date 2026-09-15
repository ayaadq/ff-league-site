# Trophy Room

Private site for a 12-team fantasy football league. See `SPEC.md` for the
product spec, `PLAN.md` for the phased build plan, and `CLAUDE.md` for
stack/conventions.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — typecheck and build for production
- `npm run typecheck` — typecheck only
- `npm run lint` — lint with oxlint
- `npm run format` — format with Prettier
- `npm run preview` — preview a production build locally

## Yearly upkeep: adding a new season

Sleeper issues a brand-new `league_id` each season when the league is
renewed, and links it back to the old one via `previous_league_id`. This
site walks that chain backwards from a single starting point
(`src/api/seasonChain.ts`), so rolling over to a new season is a one-line
change:

1. Open the new season's league on Sleeper and copy its id out of the
   URL — `https://sleeper.com/leagues/<league_id>/...`.
2. Set `SLEEPER_LEAGUE_ID` in `src/config.ts` to that id.
3. Commit and push. Vercel redeploys from `main`.

Everything downstream picks it up on its own: the season selector on team
pages, the cross-season records, and League History all read from the
resolved chain rather than a hardcoded list. Past seasons keep working,
because the chain still reaches them through `previous_league_id` — there
is nothing to backfill or migrate.

One thing not to change while you're in there: managers are keyed by
Sleeper `user_id`, which is stable across seasons. `roster_id` and
`league_id` are per-season and must never be used as a durable key (see
`CLAUDE.md`). Lore is keyed the same way, so it survives the rollover
untouched.

## Adding lore

Lore is hand-authored, versioned in the repo, and edited like code —
there is deliberately no admin UI. It lives in three files under
`src/content/lore/`:

- `teams.ts` — per-manager nickname, tagline, bio, and notable events.
- `rivalries.ts` — a named rivalry between two managers.
- `events.ts` — league-wide storylines not tied to a single rivalry.

Everything is keyed by Sleeper `user_id`, which you can read straight off
a team page's URL: `/team/<user_id>`. Each file opens with a commented
example of its shape.

Once authored, it surfaces contextually rather than on one lore page:

| What you add                        | Where it shows up                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `teams.ts` nickname / tagline / bio | That manager's team page header                                                              |
| `teams.ts` `notableEvents`          | A "Notable" section on their team page                                                       |
| `rivalries.ts` entry                | A callout on both managers' matching week rows, plus the Rivalries section on League History |
| `events.ts` entry                   | Notable Events on League History, and the team page of anyone named in `relatedUserIds`      |

All of it is optional, and partial entries are fine — a nickname with no
bio renders cleanly. Every section is guarded, so with nothing authored
(the current state) none of them render at all: no empty headings, no
placeholder copy.
