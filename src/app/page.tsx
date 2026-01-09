'use client';

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { usePoker } from "@/context/PokerContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DollarSign, TrendingUp, Trophy, Lock } from "lucide-react";
import Link from 'next/link';
import { useEffect, useState } from "react";

export default function Home() {
  const { bankroll, level, sessions } = usePoker();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; 

  // Basic derived stats
  const totalProfit = sessions.reduce((acc, s) => acc + (s.cashOut - s.buyIn), 0);
  const totalBuyIns = sessions.reduce((acc, s) => acc + s.buyIn, 0);
  const roi = totalBuyIns > 0 ? ((totalProfit / totalBuyIns) * 100).toFixed(1) + '%' : '0%';

  return (
    <AuthGuard>
        <AppShell>
         <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
             Bem-vindo de volta. Objetivo Atual: <span className="text-primary font-medium">Bater {level === 1 ? 'Micro Stakes' : 'Low Stakes'}</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            label="Bankroll" 
            value={`$${bankroll.toFixed(2)}`} 
            icon={DollarSign} 
          />
          <StatCard 
            label="ROI (Total)" 
            value={roi} 
            icon={TrendingUp} 
            trendUp={parseFloat(roi) > 0}
          />
          <StatCard 
            label="Progresso do Nível" 
            value={`Nvl ${level}`} 
            icon={Trophy} 
            className="border-primary/50 bg-primary/5"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Recent Activity Placeholder */}
             <div className="bg-card border border-border rounded-xl p-6">
                 <h3 className="text-lg font-bold mb-4">Sessões Recentes</h3>
                 {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhuma sessão registrada.
                        <div className="mt-4">
                            <Link href="/tracker" className="text-primary hover:underline">Registre sua primeira sessão</Link>
                        </div>
                    </div>
                 ) : (
                    <div className="space-y-4">
{sessions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(s => (
                            <div key={s.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium text-sm">{s.type === 'Tournament' ? 'Torneio' : 'Cash Game'} - {new Date(s.date).toLocaleDateString('pt-BR')}</p>
                                    <p className="text-xs text-muted-foreground">${s.buyIn} Buy-in</p>
                                </div>
                                <div className={`font-mono text-sm ${s.cashOut - s.buyIn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {s.cashOut - s.buyIn >= 0 ? '+' : ''}${(s.cashOut - s.buyIn).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
             </div>

             {/* Next Lesson / Locked Content */}
             <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
                 <h3 className="text-lg font-bold mb-4">Próximo Conceito</h3>
                 <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <h4 className="font-semibold text-primary">Syllabus: O Básico</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                        Foque em ranges tight e apostar por valor. Não blefe nos Micro Stakes.
                    </p>
                 </div>
                 
                 {level < 2 && (
                    <div className="mt-4 opacity-50 select-none grayscale">
                        <div className="p-4 bg-muted/50 rounded-lg border border-border flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold">3-Bet Light</h4>
                                <p className="text-sm text-muted-foreground">Bloqueado até o Nível 2</p>
                            </div>
                            <Lock className="h-5 w-5" />
                        </div>
                    </div>
                 )}
             </div>
        </div>
      </div>
    </AppShell>
  </AuthGuard>
  );
}
