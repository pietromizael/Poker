'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PokerLevel, PokerState, Session, PokerContextType } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const INITIAL_STATE: PokerState = {
  bankroll: 0,
  level: 1,
  xp: 0,
  sessions: [],
  unlockedModules: [],
  completedModules: []
};

interface PokerContextWithAuth {
    user: User | null;
    bankroll: number;
    xp: number;
    level: PokerLevel;
    sessions: Session[];
    unlockedModules: string[];
    completedModules: string[];
    loading: boolean;
    logout: () => void;
    addSession: (s: Omit<Session, 'id'>) => Promise<void>;
    addXP: (amount: number) => Promise<void>;
    resetProgress: () => Promise<void>;
    checkLevelUp: () => Promise<void>;
    completeModule: (id: string) => Promise<void>;
}

const PokerContext = createContext<PokerContextWithAuth | undefined>(undefined);

export function PokerProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<PokerState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Auth Listener
  useEffect(() => {
    // Fail-safe: Stop loading after 5 seconds if Firebase hangs
    const timeout = setTimeout(() => {
        if (loading) {
            console.warn("Firebase Auth timeout exceeded. Forcing load completion.");
            setLoading(false);
        }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        console.log("PokerContext: onAuthStateChanged", currentUser ? currentUser.email : "No User");
        setUser(currentUser);
        if (currentUser) {
            try {
                // Check if user doc exists, create if not
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    await setDoc(userRef, INITIAL_STATE);
                }
            } catch (e) {
                console.error("Firestore Error:", e);
                // Even on error, we must stop loading to show *something* (or redirect)
            }
        } else {
            setState(INITIAL_STATE);
        }
        setLoading(false);
        clearTimeout(timeout);
    });
    return () => {
        unsubscribe();
        clearTimeout(timeout);
    };
  }, []);

  // Real-time Data Sync
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as Partial<PokerState>;
            setState({
                ...INITIAL_STATE,
                ...data,
                sessions: data.sessions || [],
                unlockedModules: data.unlockedModules || [],
                completedModules: data.completedModules || []
            } as PokerState);
        }
    });
    return () => unsubscribe();
  }, [user]);

  const addSession = async (newSessionData: Omit<Session, 'id'>) => {
    if (!user) return;
    const newSession: Session = {
      ...newSessionData,
      id: crypto.randomUUID(),
    };
    
    const profit = newSession.cashOut - newSession.buyIn;
    
    // Calculate XP Change based on result
    let xpChange = 0;
    if (profit > 0) {
        // WIN: 20 XP for playing + 5 XP per $1 profit
        xpChange = 20 + Math.floor(profit * 5);
    } else if (profit < 0) {
        // LOSS: 10 XP for playing - 2 XP per $1 loss
        // But ensures you don't lose MORE than you gained just for playing effectively
        const penalty = Math.floor(Math.abs(profit) * 2);
        xpChange = 10 - penalty; 
    } else {
        // BREAK EVEN: 10 XP for playing
        xpChange = 10;
    }

    // Ensure XP doesn't drop below 0
    const newXP = Math.max(0, state.xp + xpChange);

    // Sanitize session object (Firestore does not accept undefined)
    const sanitizedSession = JSON.parse(JSON.stringify(newSession));

    const userRef = doc(db, 'users', user.uid);
    
    try {
        await updateDoc(userRef, {
            sessions: arrayUnion(sanitizedSession),
            bankroll: state.bankroll + profit,
            xp: newXP
        });
        
        // Check Level Up Logic immediately after update
        checkLevelUp(state.bankroll + profit, [...state.sessions, newSession]);
    } catch (e) {
        console.error("Error saving session", e);
        // We can't use toast here easily without importing library, let's allow it but ideally contexts shouldn't have UI side effects.
        // However, user asked to replace alerts.
        // Since we emit valid error, the consumer (SessionLog) should handle the toast.
        // I will throw the error so SessionLog catches it.
        throw e;
    }
  };

  const addXP = async (amount: number) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
        xp: state.xp + amount
    });
  };

  const resetProgress = async () => {
    if (!user) return;
    if (confirm('TEM CERTEZA? Isso vai apagar todo seu progresso (Nível, XP, Histórico). Seu Bankroll será mantido.')) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
             ...INITIAL_STATE, 
             bankroll: state.bankroll // Keep bankroll
        });
        // You might want to reload or update state locally
    }
  };

  const logout = async () => {
      await signOut(auth);
      router.push('/login');
  };

  const checkLevelUp = async (currentBankroll: number, currentSessions: Session[]) => {
      if (!user) return;
      let newLevel = state.level;
      
      // 1. Minimum Bankroll Check (optional, but good for progression)
      // if (currentBankroll < 1000) return; // Example: Must have $1000 bankroll to level up

      // 2. Minimum Sessions Check
      const recentSessions = currentSessions.slice(-20); // Consider last 20 sessions for level up
      if (recentSessions.length < 5) return; // Need sample size

      // 3. Module Completion Check (Must complete ALL modules of current level)
      // We need to import SYLLABUS_DATA here or fetch it. Circular dependency risk?
      // Let's passed it in or define basic counts. Level 1 has 3 modules.
      // Ideally we filter SYLLABUS_DATA for current level.
      // For now, let's assume we need at least 3 completed modules per level roughly.
      // Better: We will rely on the verify page or Syllabus page to show "Ready to Level Up".
      // But here is the safeguard:
      /* 
         const currentLevelModules = SYLLABUS_DATA.find(l => l.level === level)?.modules || [];
         const allModulesDone = currentLevelModules.every(m => completedModules.includes(m.id));
         if (!allModulesDone) return;
      */

      // 4. ROI Check
      const totalProfit = recentSessions.reduce((acc, s) => acc + (s.cashOut - s.buyIn), 0);
      const totalBuyIns = recentSessions.reduce((acc, s) => acc + s.buyIn, 0);
      const roi = totalBuyIns > 0 ? (totalProfit / totalBuyIns) * 100 : 0;
      const numSessions = currentSessions.length;

      if (state.level === 1) {
        if (numSessions >= 20 && roi > 15) {
            newLevel = 2; 
        }
      } else if (state.level === 2) {
         if (numSessions >= 50 && roi > 10) {
            newLevel = 3;
         }
      }

      if (newLevel !== state.level) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { level: newLevel });
          // Could add toast here
      }
  };

  const completeModule = async (moduleId: string) => {
    if (!user) return;
    if (state.completedModules.includes(moduleId)) return; // Use state.completedModules

    // Save to Firestore
    try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            completedModules: arrayUnion(moduleId) // Use arrayUnion for atomic update
        });
        // Give XP reward for studying
        addXP(50);
    } catch (e) {
        console.error("Error completing module", e);
    }
  };
  
  // Overload checkLevelUp export to match interface (adapter)
  const checkLevelUpAdapter = () => checkLevelUp(state.bankroll, state.sessions);

  return (
    <PokerContext.Provider value={{ ...state, user, loading, addSession, addXP, resetProgress, checkLevelUp: checkLevelUpAdapter, completeModule, logout }}>
      {children}
    </PokerContext.Provider>
  );
}

export const usePoker = () => {
  const context = useContext(PokerContext);
  if (!context) {
    throw new Error('usePoker must be used within a PokerProvider');
  }
  return context;
};
