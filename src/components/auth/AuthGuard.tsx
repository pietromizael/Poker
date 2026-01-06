'use client';

import { usePoker } from "@/context/PokerContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = usePoker();
    const router = useRouter();

    useEffect(() => {
        console.log("AuthGuard Effect:", { loading, user: user?.email, path: window.location.pathname });
        if (!loading && !user) {
            console.log("AuthGuard: Redirecting to /login due to no user");
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    return <>{children}</>;
}
