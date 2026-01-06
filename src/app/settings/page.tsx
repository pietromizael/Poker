'use client';

import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePoker } from '@/context/PokerContext';
import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle, Trash2, LogOut } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore'; 
import { toast } from 'sonner';

export default function SettingsPage() {
    const { user, bankroll, logout, resetProgress, addXP } = usePoker();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleBankrollUpdate = async (type: 'deposit' | 'withdraw') => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.warning('Por favor insira um valor válido.');
            return;
        }
        if (!user) return;

        setLoading(true);

        try {
            const value = Number(amount);
            const userRef = doc(db, 'users', user.uid);
            
            // If withdrawing, check if enough funds (optional, but good UX)
            if (type === 'withdraw' && value > bankroll) {
                 toast.error('Fundos insuficientes para este saque.');
                 setLoading(false);
                 return;
            }

            await updateDoc(userRef, {
                bankroll: increment(type === 'deposit' ? value : -value)
            });

            toast.success(`${type === 'deposit' ? 'Depósito' : 'Saque'} de $${value} realizado com sucesso!`);
            setAmount('');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao processar transação.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        // Since we removed window.confirm in Context for UX (or should rely on it there),
        // let's just trigger it. If we want global non-blocking UI, we could use a custom Modal.
        // For "Alert replacement", using native confirm for DESTRUCTIVE actions is rare standard exception,
        // but toast for success is better.
        // The previous context method has the native confirm.
        try {
            await resetProgress();
            toast.success('Progresso resetado com sucesso.');
        } catch (e) {
            // Cancelled or error
        }
    };

    return (
        <AuthGuard>
            <AppShell>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie sua conta e banca.
                    </p>
                </div>

                <div className="max-w-2xl space-y-8">
                    
                    {/* Bankroll Management */}
                    <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ArrowUpCircle className="h-5 w-5 text-green-500" />
                            Gerenciar Banca (Stack)
                        </h2>
                        
                        <div className="bg-muted/30 p-4 rounded-lg mb-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Banca Atual</p>
                                <p className="text-2xl font-mono font-bold">${bankroll.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Valor ($)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-input border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-4">
                            <button 
                                onClick={() => handleBankrollUpdate('deposit')}
                                disabled={loading}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-md transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ArrowUpCircle className="h-4 w-4" />
                                {loading ? 'Processando...' : 'Depositar'}
                            </button>
                            <button 
                                onClick={() => handleBankrollUpdate('withdraw')}
                                disabled={loading}
                                className="flex-1 bg-destructive hover:bg-destructive/80 text-white font-medium py-2 rounded-md transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ArrowDownCircle className="h-4 w-4" />
                                {loading ? 'Processando...' : 'Sacar'}
                            </button>
                        </div>
                    </section>

                    {/* Account Settings */}
                    <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Conta</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">Email Conectado</label>
                                <div className="p-2 bg-muted/50 rounded border border-border text-sm mt-1">
                                    {user?.email}
                                </div>
                            </div>

                            <button 
                                onClick={logout}
                                className="w-full border border-border text-foreground hover:bg-muted font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                Sair da Conta
                            </button>
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="border border-red-500/20 bg-red-500/5 rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-4 text-red-500 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Zona de Perigo
                        </h2>
                        
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">Resetar Progresso</h3>
                                <p className="text-sm text-muted-foreground">Apaga XP, Nível e Histórico. Mantém Bankroll.</p>
                            </div>
                            <button 
                                onClick={handleReset}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4" />
                                Resetar
                            </button>
                        </div>
                    </section>

                </div>
            </AppShell>
        </AuthGuard>
    );
}
