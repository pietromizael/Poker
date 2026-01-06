'use client';

import { AppShell } from '@/components/layout/AppShell';
import { SessionLog } from '@/components/tracker/SessionLog';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function TrackerPage() {
  return (
    <AuthGuard>
        <AppShell>
            <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Tracker de Sessões</h1>
            <p className="text-muted-foreground mt-1">
                Registre seus resultados honestamente. O Mentor está de olho no seu ROI.
            </p>
            </div>

            <SessionLog />
        </AppShell>
    </AuthGuard>
  );
}
