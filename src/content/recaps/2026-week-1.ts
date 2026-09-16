import type { WeekRecapContent } from './types'

/** Week 1, transcribed from the league's own Week 1 recap PDF.
 *
 * Only the writing lives here. Every figure the prose refers to —
 * 170.1, 148.4 of 148.4, 46.5 on the bench, 93.54 margin — is computed
 * independently from Sleeper by api/weeklyRecap.ts, and was checked
 * against this document: all twelve teams reproduce their published
 * possible score and efficiency exactly. */
export const week: WeekRecapContent = {
  season: '2026',
  week: 1,
  kicker: 'Official · Unauthorized · Unapologetic',
  title: 'Week 1 Recap',
  subtitle:
    'Six matchups. Six blowouts-and-a-half. One perfect lineup. One team that scored 54 points with an S-rank next to its name.',

  storylinesTitle: 'What the hell just happened',
  storylines: [
    {
      lede: 'The draft report got its shit rocked.',
      body: 'Every single pick this thing roasted in August went nuclear on Sunday. Jaxson Dart: 26.6. D’Andre Swift: 33.4. Caleb Williams: 37.26 and four touchdowns. Kenneth Walker’s "busted-ass foot": 37.1. Meanwhile the team this report crowned with the lone S-rank scored 54.86. Humble pie has been served, and yes, we’re eating it in front of you.',
    },
    {
      lede: 'Zuhayr runs the league in every sense now.',
      body: '170.1, the high score of the week, with the quarterback the entire league laughed at. The commissioner didn’t just win — he won with the exact roster construction eleven people said would kill him. He gets the microphone until further notice.',
    },
    {
      lede: 'Ayaad’s S-rank aged like milk in a hot car.',
      body: '54.86 points. Dead last. Blown out by 93.54. Four "untouchable" wideouts combined for 22.9. Kyle Pitts, the self-declared PPR demon, caught zero passes. We will be spending an entire page on this.',
    },
    {
      lede: 'Justin submitted the only perfect lineup in the league.',
      body: '148.4 scored, 148.4 possible, 100% efficiency. Nobody else was even close. Meanwhile Zain left 46.5 points on his bench and Nidhish benched a 21-point Patrick Mahomes for a 9-point Drake Maye.',
    },
    {
      lede: 'Top six scorers went 6-0. Bottom six went 0-6.',
      body: 'No flukes, no bad beats, no schedule excuses. Everybody got exactly what their lineup deserved, which for half this league is devastating news.',
    },
  ],

  awardsTitle: 'The Week 1 Awards',
  awards: [
    {
      emoji: '🎤',
      title: 'Trash Talk Rights',
      userId: '608578919938973696',
      body: 'Zuhayr. 170.1, the high score, with Jaxson Dart and D’Andre Swift — the two picks this entire league mocked in writing. He runs the league, he won the week, and he gets to say whatever he wants until Sunday.',
    },
    {
      emoji: '🚫',
      title: 'Trash Talk Rights Revoked',
      userId: '558362285233664000',
      body: 'Ayaad. 54.86 points with an S-rank on the letterhead. He does not get to type in the group chat this week. He gets to sit there and think about Kyle Pitts.',
    },
    {
      emoji: '🧠',
      title: 'Manager of the Week',
      userId: '858983252424261632',
      body: 'Justin. The only perfect lineup in the league — 148.4 out of 148.4. Nobody else even got to 99.4%. Set it, forgot it, cashed it.',
    },
    {
      emoji: '🪑',
      title: 'The Bench Warmer Award',
      userId: '1265846882979028993',
      body: 'Zain. 46.5 points left on the bench, 57% efficiency, and he owned the week’s TE1 (Likely, 27.8) while starting a 3.2. Historic incompetence.',
    },
    {
      emoji: '📱',
      title: 'The "Open Your App" Award',
      userId: '861473628066299904',
      body: 'Nidhish. Benched Patrick Mahomes (21.66) for Drake Maye (9.82), then benched Deebo (18) and Kincaid (18) for good measure. 32.64 points, gone, voluntarily.',
    },
    {
      emoji: '🙇',
      title: 'Apology Corner',
      userId: '985633204772147200',
      body: 'swishhh99. This report roasted the Caleb Williams pick in three straight versions. He threw four TDs for 37.26 — the top QB score in the league. We were wrong. He still lost. Life is pain.',
    },
    {
      emoji: '🎣',
      title: 'The Wrong Tight End Award',
      userId: '859328673705230336',
      body: 'Joey. Hoarded three tight ends, started the 36-year-old, benched the 23.7, lost by 9.84. Poetry.',
    },
    {
      emoji: '☠️',
      title: 'Most Cursed Man Alive',
      userId: '846079026111062016',
      body: 'Jai. Second-best lineup efficiency in the league (98.5%), a 35.66 from Josh Allen, and he lost by 48 because Saquon scored 9. Robbed in the draft, robbed in Week 1.',
    },
    {
      // No userId: this one is about a player, not a manager.
      emoji: '👑',
      title: 'Player of the Week',
      body: 'Caleb Williams — 37.26 and four touchdowns. Honorable mention: Kenneth Walker (37.1) and Derrick Henry (36.3), both on teams that were told their guys were washed.',
    },
    {
      emoji: '💀',
      title: 'Bust of the Week',
      body: 'Kyle Pitts. Played the entire game. One target. Zero catches. 0.00 points. The PPR demon has been exorcised.',
    },
  ],
}
