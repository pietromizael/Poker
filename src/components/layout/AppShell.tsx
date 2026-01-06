'use client';

import React from 'react';
import { usePoker } from '@/context/PokerContext';
import { Home, Calculator, Bot, Settings, Award, BookOpen, Menu } from 'lucide-react';
import Link from 'next/link';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { bankroll, level, xp, logout } = usePoker();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:inset-auto`}
      >
        <div className="h-16 flex items-center px-6 border-b border-border">
            <Award className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-bold tracking-tight">PokerMentor</span>
        </div>

        <div className="p-4 space-y-1">
            <NavLink href="/" icon={Home}>Dashboard</NavLink>
            <NavLink href="/syllabus" icon={BookOpen}>Syllabus</NavLink>
            <NavLink href="/mentor" icon={Bot} >Mentor IA</NavLink>
            <NavLink href="/tracker" icon={Calculator}>Tracker de Sessões</NavLink>
            <div className="pt-4 mt-4 border-t border-border">
                <NavLink href="/settings" icon={Settings}>Configurações</NavLink>
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 rounded-md hover:bg-red-500/10 transition-colors mt-2 cursor-pointer"
                >
                  <span className="h-4 w-4">←</span>
                  Sair
                </button>
            </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-card/50 backdrop-blur-sm border-t border-border">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                    <span className="font-bold text-primary">N{level}</span>
                </div>
                <div>
                   <p className="text-sm font-medium">Nível {level}</p>
                   <p className="text-xs text-muted-foreground">{xp} XP</p>
                </div>
            </div>
             {/* Simple XP Bar */}
             <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(xp % 1000) / 10}%` }} />
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-background/95 backdrop-blur z-40 sticky top-0">
            <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
                <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1" /> {/* Spacer */}

            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Bankroll</p>
                    <p className={`text-lg font-mono font-medium ${bankroll >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${bankroll.toFixed(2)}
                    </p>
                </div>
                {/* Avatar / Profile placeholder */}
                <div className="h-8 w-8 rounded-full bg-muted border border-border" />
            </div>
        </header>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
    return (
        <Link 
            href={href} 
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors"
        >
            <Icon className="h-4 w-4" />
            {children}
        </Link>
    )
}
