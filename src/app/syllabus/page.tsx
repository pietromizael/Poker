'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePoker } from '@/context/PokerContext';
import { SYLLABUS_DATA } from '@/lib/syllabusData';
import { Lock, CheckCircle, BookOpen, ChevronRight, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function SyllabusPage() {
    console.log("SyllabusPage: Rendering");
    const { level, completedModules } = usePoker();
    const router = useRouter();

    const startExam = (moduleId: string) => {
        router.push(`/mentor?mode=exam&moduleId=${moduleId}`);
    };

    const startStudy = (moduleId: string) => {
        router.push(`/mentor?mode=study&moduleId=${moduleId}`);
    };

    return (
        <AuthGuard>
            <AppShell>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Syllabus</h1>
                    <p className="text-muted-foreground mt-1">
                        Seu mapa para a lucratividade. Domine um nível para desbloquear o próximo.
                    </p>
                </div>

                <div className="space-y-12">
                    {SYLLABUS_DATA.map((lvlData) => {
                        const isUnlocked = level >= lvlData.level;
                        const isCompleted = level > lvlData.level;
                        
                        return (
                            <section key={lvlData.level} className={cn("relative pl-8 border-l-2", isUnlocked ? "border-primary" : "border-border")}>
                                {/* Level Indicator Dot */}
                                <div className={cn(
                                    "absolute -left-[11px] top-0 h-5 w-5 rounded-full border-4",
                                    isUnlocked ? "bg-background border-primary" : "bg-card border-border"
                                )} />

                                <div className="mb-6">
                                    <h2 className={cn("text-2xl font-bold flex items-center gap-3", !isUnlocked && "text-muted-foreground")}>
                                        {lvlData.title}
                                        {!isUnlocked && <Lock className="h-5 w-5" />}
                                        {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
                                    </h2>
                                    <p className="text-muted-foreground text-sm mt-1">{lvlData.description}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {lvlData.modules.map((module) => (
                                        <div 
                                            key={module.id} 
                                            className={cn(
                                                "rounded-xl p-5 border transition-all",
                                                isUnlocked 
                                                    ? "bg-card border-border hover:border-primary/50 group cursor-default" 
                                                    : "bg-muted/30 border-transparent opacity-60 grayscale select-none"
                                            )}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className={cn("p-2 rounded-lg", isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                                    <BookOpen className="h-5 w-5" />
                                                </div>
                                                {!isUnlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                                            </div>
                                            
                                            <h3 className="font-semibold text-lg mb-2">{module.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                                {module.description}
                                            </p>

                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {module.concepts.map(concept => (
                                                    <span 
                                                        key={concept} 
                                                        className={cn(
                                                            "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-background border border-border",
                                                            isUnlocked ? "text-primary" : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {concept}
                                                    </span>
                                                ))}
                                            </div>

                                            {isUnlocked && (
                                                <div className="pt-4 border-t border-border/50">
                                                    {completedModules.includes(module.id) ? (
                                                        <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                                                            <CheckCircle className="h-4 w-4" />
                                                            Módulo Dominado
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => startStudy(module.id)}
                                                                className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 rounded-md transition-colors text-sm font-bold cursor-pointer"
                                                            >
                                                                <BookOpen className="h-4 w-4" />
                                                                Estudar
                                                            </button>
                                                            <button 
                                                                onClick={() => startExam(module.id)}
                                                                className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-2 rounded-md transition-colors text-sm font-bold cursor-pointer"
                                                            >
                                                                <Swords className="h-4 w-4" />
                                                                Desafiar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </AppShell>
        </AuthGuard>
    );
}
