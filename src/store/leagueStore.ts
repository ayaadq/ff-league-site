import { create } from 'zustand'
import type { SleeperRoster } from '../api/types'

/** A wall post, and the wall-owner it was left on -- keyed by the
 * *wall owner's* Sleeper `user_id`, not `roster_id`/a generic "teamId"
 * (CLAUDE.md: user_id is this project's only durable cross-season
 * identity key; roster_id is per-season and must not be used as a
 * long-term reference). `authorUserId` is the same kind of id, for
 * whoever left the post. */
export interface TrashTalkPost {
  id: string
  authorUserId: string
  body: string
  postedAt: number
}

interface LeagueStore {
  currentWeek: number
  currentSeason: string | null
  /** Sorted standings (see `sortStandings`, src/api/standings.ts) mirrored
   * in from HomePage.tsx once React Query resolves them -- this store
   * doesn't fetch anything itself. TanStack Query remains the one fetch/
   * cache layer (CLAUDE.md); this is a read-only copy for components that
   * want standings without a prop passed down to them. */
  teamStandings: SleeperRoster[]
  /** The wall currently being viewed, by owner user_id. */
  selectedTeamForWall: string | null

  trashTalkWalls: Record<string, TrashTalkPost[]>
  /** By user_id. */
  userPoints: Record<string, number>
  /** By user_id. A cosmetic rank-driven size multiplier -- no design or
   * spec exists for this yet (PLAN.md's Lenis/Zustand/Spline phase note),
   * so treat the exact scale as a placeholder, not a tuned number. */
  spongeSize: Record<string, number>

  setCurrentWeek: (week: number) => void
  setCurrentSeason: (season: string) => void
  setTeamStandings: (standings: SleeperRoster[]) => void
  setSelectedTeamForWall: (userId: string | null) => void
  addTrashTalkPost: (wallOwnerUserId: string, post: TrashTalkPost) => void
  awardPoint: (userId: string) => void
  /** `standing` is 1-based (1st place = 1). Every team gets a positive
   * multiplier that scales with rank -- 1st place is `teamCount`x, last
   * place is 1x. (The brief's own "1st = 10x, 12th = 1x" example doesn't
   * reduce to one consistent formula for a 12-team league -- applied
   * literally it goes negative for the bottom teams -- so this uses the
   * generic version of the same idea instead of copying that arithmetic.) */
  setSpongeSizeFromStanding: (userId: string, standing: number, teamCount: number) => void
}

export const useLeagueStore = create<LeagueStore>((set) => ({
  currentWeek: 1,
  currentSeason: null,
  teamStandings: [],
  selectedTeamForWall: null,
  trashTalkWalls: {},
  userPoints: {},
  spongeSize: {},

  setCurrentWeek: (week) => set({ currentWeek: week }),
  setCurrentSeason: (season) => set({ currentSeason: season }),
  setTeamStandings: (standings) => set({ teamStandings: standings }),
  setSelectedTeamForWall: (userId) => set({ selectedTeamForWall: userId }),

  addTrashTalkPost: (wallOwnerUserId, post) =>
    set((state) => ({
      trashTalkWalls: {
        ...state.trashTalkWalls,
        [wallOwnerUserId]: [...(state.trashTalkWalls[wallOwnerUserId] ?? []), post],
      },
    })),

  awardPoint: (userId) =>
    set((state) => ({
      userPoints: { ...state.userPoints, [userId]: (state.userPoints[userId] ?? 0) + 1 },
    })),

  setSpongeSizeFromStanding: (userId, standing, teamCount) =>
    set((state) => ({
      spongeSize: { ...state.spongeSize, [userId]: teamCount - standing + 1 },
    })),
}))
