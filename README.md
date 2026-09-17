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

## Adding a weekly recap

The site computes every hard number in a weekly recap by itself, straight
from Sleeper, the moment scores settle: final scores, margins, each
team's best possible lineup, lineup efficiency, points left on the bench,
top scorer, the biggest blowout and the closest game. None of that is
written by hand, and none of it is stored in the repo. See
`src/api/weeklyRecap.ts`.

What is written by hand is the commentary — headlines, storylines, the
roast under each award, the line beside each power ranking. Those live in
`src/content/recaps/`.

To add a week, create `<season>-week-<n>.ts` exporting one
`WeekRecapContent`, then import it in `src/content/recaps/index.ts` and
add it to the `recaps` array. `types.ts` documents every field and
`index.ts` carries a worked example. Every field beyond `season` and
`week` is optional: a week with no file renders as pure data, and a week
with only headlines renders those and nothing more.

Everything is keyed by Sleeper `user_id`, never `roster_id`, so a recap
still points at the right people after the season rolls over. The ids for
the current league:

| Manager   | Team                      | user_id               |
| --------- | ------------------------- | --------------------- |
| Zuhayr    | My Strange Nabers         | `608578919938973696`  |
| Tejas     | 2x Champion               | `731614826014564352`  |
| Raghav    | Rags                      | `995074340020453376`  |
| Justin    | justins team              | `858983252424261632`  |
| Rohan     | I Love to Chase Brown ppl | `859091870352031744`  |
| Supratim  | Njigba Please             | `734958413582336000`  |
| swishhh99 | Waddling to the Mooon     | `985633204772147200`  |
| Joey      | hopeless again            | `859328673705230336`  |
| Jai       | Mark up the Lamb Price    | `846079026111062016`  |
| Nidhish   | Hey Pukie                 | `861473628066299904`  |
| Zain      | ConkeyonmyCooktillIGoff   | `1265846882979028993` |
| Ayaad     | Chasing My Next Pacheco   | `558362285233664000`  |

Team names change; ids do not. If a name in that table looks wrong, trust
the id — or re-read the current names from
`https://api.sleeper.app/v1/league/<league_id>/users`.

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

## Adding smack talk

Sleeper has no chat/trash-talk API, so the Home page's Smack Talk section
is hand-authored, the same pattern as lore: versioned in the repo, edited
like code, no admin UI. It lives in `src/content/banter/lines.ts` — one
array, each entry a `BanterLine` (`types.ts` documents every field,
`lines.ts` carries a worked example).

Each line is keyed by the speaking manager's Sleeper `user_id` (see the
table above), with an optional `toUserId` if it's aimed at someone
specific, and an optional `week` to tie it to a given week's Smack Talk
feed. A line with no `week` never surfaces in that per-week feed — leave
it off only if you're keeping the entry for reference, not for it to
show up.

Empty is a fully supported state, same as lore: with nothing authored
(the current state) the whole section is absent from Home, not an empty
heading.
