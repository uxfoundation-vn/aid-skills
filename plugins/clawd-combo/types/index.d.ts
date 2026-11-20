export type BaseKind = 'hi' | 'thinking' | 'working' | 'needs' | 'done' | 'compacting' | 'idle'

export type Base = {
  kind: BaseKind
  since: number
  /** thinking verb, tool detail, done summary, what is needed */
  line: string
  /** tool name, or permission / question / plan for needs */
  detail: string
}

export type ReactionKind = 'oops' | 'testsFail' | 'testsPass' | 'loved' | 'hmm' | 'fit'

export type Reaction = { kind: ReactionKind; line: string; until: number }

export type Settings = {
  isHidden: boolean
  moods: boolean
  reactions: boolean
  tantrums: boolean
  hemisphere: 'north' | 'south'
}

/** a button of the branch rows: `repo:<dir>`, `branch:<name>` or `branch-back` */
export type BranchItem = { key: string; label: string; isCurrent: boolean }
/**
 * the rows under the band: the session folder's repos (dir null), or one repo's local branches (dir relative to the
 * session's folder, current the branch it is on, '' when detached)
 */
export type BranchMenu = { dir: string | null; current: string; items: BranchItem[] }

export type ToolsToday = { date: string; count: number }

declare module 'claude-code' {
  interface PluginState {
    'clawd-combo': {
      base: Base
      reaction: Reaction | null
      settings: Settings
      tick: number
      deskTick: number
      toolsToday: ToolsToday
      demoStart: number | null
      branchMenu: BranchMenu | null
    }
  }
}
