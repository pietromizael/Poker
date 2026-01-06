'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ChatInterface } from '@/components/mentorship/ChatInterface';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function MentorPage() {
  return (
    <AuthGuard>
        <AppShell>
            <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Mentor IA</h1>
            <p className="text-muted-foreground mt-1">
                Seu coach de poker progressivo pessoal.
            </p>
            </div>

            <ChatInterface />
        </AppShell>
    </AuthGuard>
  );
}
