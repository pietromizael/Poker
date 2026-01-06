'use client';

import { usePoker, Session } from '@/context/PokerContext';
import { useState } from 'react';
import { Loader2, Upload, FileText, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function SessionLog() {
  const { addSession } = usePoker();
  const [loading, setLoading] = useState(false);
  
  // Initialize times
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const formatDateTime = (date: Date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    type: 'Tournament' as 'Tournament' | 'Cash',
    buyIn: '',
    cashOut: '',
    startTime: formatDateTime(oneHourAgo),
    endTime: formatDateTime(now),
    notes: '',
  });

  const [handHistoryFile, setHandHistoryFile] = useState<{name: string, content: string} | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to roughly 500KB to prevent Firestore issues
    if (file.size > 500 * 1024) {
        toast.error("O arquivo é muito grande. O limite é 500KB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        setHandHistoryFile({
            name: file.name,
            content: text
        });
        toast.success("Arquivo anexado com sucesso!");
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        const start = new Date(formData.startTime);
        const end = new Date(formData.endTime);
        const durationMs = end.getTime() - start.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        if (durationMinutes <= 0) {
            toast.warning("A hora de término deve ser depois da hora de início.");
            setLoading(false);
            return;
        }

        const session: Omit<Session, 'id'> = {
            date: start.toISOString(),
            type: formData.type,
            buyIn: Number(formData.buyIn) || 0,
            cashOut: Number(formData.cashOut) || 0,
            durationMinutes: durationMinutes,
            notes: formData.notes,
            handHistory: handHistoryFile?.content
        };

        await addSession(session);

        // Reset Form
        setFormData({
            ...formData,
            buyIn: '',
            cashOut: '',
            notes: ''
        });
        setHandHistoryFile(null);
        toast.success('Sessão salva! XP atualizado.');
    } catch (error) {
        console.error(error);
        toast.error('Erro ao salvar sessão.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-2xl mx-auto shadow-lg">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Logar Sessão
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Game Type */}
        <div className="flex gap-4 p-1 bg-muted/50 rounded-lg">
            {['Tournament', 'Cash'].map((t) => (
                <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({...formData, type: t as any})}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all cursor-pointer ${formData.type === t ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-background/50'}`}
                >
                    {t === 'Tournament' ? 'Torneio (MTT/SnG)' : 'Cash Game'}
                </button>
            ))}
        </div>

        {/* Time Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Início</label>
                <input 
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    required
                    className="w-full bg-input border border-border rounded-md px-3 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                />
            </div>
            <div>
                 <label className="block text-sm font-medium text-muted-foreground mb-1">Término</label>
                 <input 
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    required
                    className="w-full bg-input border border-border rounded-md px-3 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                />
            </div>
        </div>

        {/* Money Inputs */}
        <div className="grid grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-border/50">
            <div>
                <label className="block text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Buy-in Total</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.buyIn}
                        onChange={e => setFormData({...formData, buyIn: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg pl-8 pr-4 py-3 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-green-400 mb-2 uppercase tracking-wider">Cash Out Total</label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.cashOut}
                        onChange={e => setFormData({...formData, cashOut: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg pl-8 pr-4 py-3 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                    />
                </div>
            </div>
        </div>

        {/* Hand History Upload */}
        <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Importar Histórico (Arquivo .txt)</label>
            
            {!handHistoryFile ? (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer relative group">
                    <input 
                        type="file" 
                        accept=".txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-sm font-medium text-foreground">Clique para selecionar arquivo</p>
                    <p className="text-xs text-muted-foreground mt-1">Suporta PokerStars, 888, etc. (Máx 500KB)</p>
                </div>
            ) : (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{handHistoryFile.name}</span>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setHandHistoryFile(null)}
                        className="p-1 hover:bg-primary/20 rounded-full transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4 text-primary" />
                    </button>
                </div>
            )}
        </div>

        {/* Optional Notes */}
        <div>
           <label className="block text-sm font-medium text-muted-foreground mb-1">Notas Rápidas (Opcional)</label>
            <textarea 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Algo específico pra lembrar?"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 text-lg rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Salvar Sessão'}
        </button>
      </form>
    </div>
  );
}
