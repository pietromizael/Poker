export type PokerLevel = 1 | 2 | 3;

export interface Session {
  id: string;
  date: string;
  type: 'Tournament' | 'Cash';
  buyIn: number;
  cashOut: number;
  durationMinutes: number;
  notes?: string;
  handHistory?: string;
}

export interface PokerState {
  bankroll: number;
  level: PokerLevel;
  xp: number; // Experience points for gamification
  sessions: Session[];
  unlockedModules: string[]; // IDs of syllabus modules
  completedModules: string[]; // IDs of mastered modules
}

export interface PokerContextType extends PokerState {
  addSession: (session: Omit<Session, 'id'>) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  resetProgress: () => Promise<void>;
  checkLevelUp: () => Promise<void>;
  completeModule?: (id: string) => Promise<void>; // Make optional to avoid heavy refactor if unused in some consumers
}
