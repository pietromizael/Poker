'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  console.log("LoginPage: Rendered");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        if (isSignUp) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        router.push('/');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">PokerMentor</h1>
            <p className="text-muted-foreground mt-2">Entre para salvar seu progresso</p>
        </div>

        {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 text-center">
                {error}
            </div>
        )}

        <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-2.5 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center mb-6 cursor-pointer disabled:cursor-not-allowed"
        >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar com Google'}
        </button>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou com email</span>
            </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
                <input 
                    type="email" 
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <input 
                    type="password" 
                    placeholder="Senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-md hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? 'Aguarde...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
            </button>
        </form>

        <div className="mt-6 text-center text-sm">
            <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline hover:text-primary/80 cursor-pointer"
            >
                {isSignUp ? 'Já tem uma conta? Entre' : 'Precisa de uma conta? Cadastre-se'}
            </button>
        </div>
      </div>
    </div>
  );
}
