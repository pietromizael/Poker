'use client';

import { useState, useRef, useEffect } from 'react';
import { usePoker } from '@/context/PokerContext';
import { Send, User, Bot, Loader2, MessageSquare, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { SYLLABUS_DATA } from '@/lib/syllabusData';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt?: Timestamp;
}

interface Thread {
    id: string;
    title: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Helper to parse content with images
const parseContent = (content: string) => {
    // Matches [[IMAGE: ...]] or [[GENERATE_IMAGE: ...]] case insensitive, allows formatting
    const imageRegex = /\[\[\s*(?:GENERATE_IMAGE|IMAGE)\s*:\s*([\s\S]*?)\s*\]\]/gi;
    return content.replace(imageRegex, (_, prompt) => {
        console.log("parseContent: Found Image Tag!", prompt.substring(0, 20) + "...");
        return `\n\n![Generated Image](image://${encodeURIComponent(prompt)})\n\n`;
    });
};

// Custom Image Component that handles API fetching
const GeneratedImage = ({ prompt }: { prompt: string }) => {
    const [loading, setLoading] = useState(true);
    
    // Construct GET URL for browser caching
    // We sanitize just in case, though encodeURIComponent handles most
    const imageUrl = `/api/generate-image?prompt=${encodeURIComponent(prompt)}`;

    return (
        <span className="block my-4 rounded-lg overflow-hidden border border-border shadow-md transition-all duration-500 animate-in fade-in zoom-in-95 bg-black/40 min-h-[200px] relative">
            
            {loading && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/20 animate-pulse z-10 w-full h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Gerando visualização da IA...</span>
                </span>
            )}
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
                src={imageUrl} 
                alt={prompt} 
                className="w-full h-auto object-contain"
                onLoad={() => setLoading(false)}
                onError={(e) => {
                    setLoading(false);
                    // Standard fallback handled by API returning a valid image, 
                    // but if that fails, we can set local src here.
                }}
            />
        </span>
    );
};


export function ChatInterface() {
  const { user, bankroll, level, sessions, completeModule } = usePoker();
  const searchParams = useSearchParams();
  const router = useRouter(); // For clearing params
  
  // Params trigger new specific threads
  const examModuleId = searchParams.get('moduleId');
  const mode = searchParams.get('mode') as 'exam' | 'study' | null;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef<string | null>(null);

  // 1. Load Threads List
  useEffect(() => {
    if (!user) return;
    const threadsRef = collection(db, 'users', user.uid, 'threads');
    const q = query(threadsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setThreads(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Thread)));
    }, (error) => {
        console.error("Threads Listener Error:", error);
        if (error.code === 'permission-denied') {
            toast.error("Erro de permissão: Atualize as Regras do Firestore para permitir subcoleções.");
        }
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Handle Auto-Creation or Selection based on Params
  useEffect(() => {
    // If params missing, do nothing
    if (!user || !examModuleId || !mode) return;
    
    // Prevent double execution (Strict Mode or fast re-renders)
    const lockKey = `${examModuleId}-${mode}`;
    if (processingRef.current === lockKey) return;
    processingRef.current = lockKey;

    // Logic: Create a new thread immediately for this module context
    const createContextThread = async () => {
        // Find module
        const moduleInfo = SYLLABUS_DATA.flatMap(l => l.modules).find(m => m.id === examModuleId);
        const title = moduleInfo 
            ? `${mode === 'exam' ? '⚔️ Desafio' : '📚 Estudo'}: ${moduleInfo.title}`
            : 'Nova Conversa';

        try {
            const threadsRef = collection(db, 'users', user.uid, 'threads');
            const docRef = await addDoc(threadsRef, {
                title,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                context: { mode, moduleId: examModuleId }
            });
            
            // Set initial message
            const messagesRef = collection(db, 'users', user.uid, 'threads', docRef.id, 'messages');
            const initialContent = moduleInfo 
                ? (mode === 'exam' 
                    ? `⚔️ **MODO DESAFIO: ${moduleInfo.title}** ⚔️\n\nEstou pronto para testar seu conhecimento. Digite "Estou pronto" para começar.`
                    : `📚 **MODO ESTUDO: ${moduleInfo.title}** 📚\n\nVamos dominar este tópico. Posso explicar os conceitos ou passar exemplos. Como prefere começar?`)
                : "Olá!";
            
            await addDoc(messagesRef, {
                role: 'model',
                content: initialContent,
                createdAt: serverTimestamp()
            });

            setActiveThreadId(docRef.id);
            // Clear params so we don't loop create
            router.replace('/mentor'); 
        } catch (e) {
            console.error("Error creating thread", e);
            // If error, maybe unlock to try again? simpler to just leave locked strictly once per mount
        }
    };
    
    createContextThread();
  }, [user, examModuleId, mode, router]);

  // 3. Load Messages for Active Thread
  useEffect(() => {
    if (!user || !activeThreadId) {
        setMessages([]);
        return;
    }

    const messagesRef = collection(db, 'users', user.uid, 'threads', activeThreadId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
        console.error("Messages Listener Error:", error);
    });

    return () => unsubscribe();
  }, [user, activeThreadId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // Track which thread is confirming

  const createNewThread = async () => {
      if (!user) return;
      const threadsRef = collection(db, 'users', user.uid, 'threads');
      const docRef = await addDoc(threadsRef, {
          title: 'Nova Conversa',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
      });
      setActiveThreadId(docRef.id);
  };

  const deleteThread = async (e: React.MouseEvent, threadId: string) => {
      e.stopPropagation();
      if (!user) return;

      // 1. Double verification logic
      if (deleteConfirm !== threadId) {
          setDeleteConfirm(threadId);
          setTimeout(() => setDeleteConfirm(null), 3000); // Reset after 3s
          return;
      }

      // 2. Perform Delete
      try {
          await deleteDoc(doc(db, 'users', user.uid, 'threads', threadId));
          if (activeThreadId === threadId) setActiveThreadId(null);
          toast.success("Conversa apagada.");
      } catch (e: any) { 
          console.error(e); 
          toast.error("Erro ao apagar: " + (e.code === 'permission-denied' ? 'Permissão negada.' : 'Erro desconhecido.'));
      }
  };

  const handleGenerateImage = async (messageId: string, content: string) => {
      if (!user || !activeThreadId) return;
      
      try {
        const messageRef = doc(db, 'users', user.uid, 'threads', activeThreadId, 'messages', messageId);
        
        // Sanitize prompt to avoid breaking the regex with nested brackets
        let visualPrompt = content.length > 500 ? content.slice(0, 500) : content;
        visualPrompt = visualPrompt.replace(/[\[\]]/g, ''); // Remove squares
        
        const newTag = `\n\n[[IMAGE: ${visualPrompt}]]`;
        const newContent = content + newTag;

        console.log("Appended Tag for Image:", newTag); // Debug

        await updateDoc(messageRef, {
            content: newContent,
            updatedAt: serverTimestamp()
        });
        
        toast.success("Solicitando imagem...");
      } catch (e) {
          console.error("Error updating message for image:", e);
          toast.error("Erro ao solicitar imagem.");
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !user) return;
    
    // If no active thread, create one first
    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
        const threadsRef = collection(db, 'users', user.uid, 'threads');
        const docRef = await addDoc(threadsRef, { title: 'Nova Conversa', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        currentThreadId = docRef.id;
        setActiveThreadId(currentThreadId);
    }

    const userContent = input.trim();
    setInput('');
    setLoading(true);

    try {
      const messagesRef = collection(db, 'users', user.uid, 'threads', currentThreadId, 'messages');
      const threadDocRef = doc(db, 'users', user.uid, 'threads', currentThreadId);
      
      // Update thread timestamp and title if new
      const updateData: any = { updatedAt: serverTimestamp() };
      if (messages.length === 0) {
          updateData.title = userContent.slice(0, 30) + "...";
      }
      await updateDoc(threadDocRef, updateData);

      // 1. Save User Message
      await addDoc(messagesRef, {
          role: 'user',
          content: userContent,
          createdAt: serverTimestamp()
      });

      // 2. AI Logic...
      // Retrieve Context if any (we could store context in thread doc, but for now generic is fine unless specific thread)
      // Ideally we check thread.dta().context here, but for simplicity let's rely on message memory or generic prompt
      
      const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
      // Do NOT push the current message to history; it is sent as 'message' in the body

      const userStats = { bankroll, level, sessions };

      // We need to fetch the thread doc to check if it has 'context' (Exam/Study)
      // Just passing generic prompt for now unless we stored it in state. 
      // IMPROVEMENT: Load thread metadata into state to re-inject "SYSTEM: EXAM MODE" if needed.
      // For now, let's just chat normally, assuming the AI sees previous context in history.
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: userContent, 
            history, 
            userStats
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      let aiResponse = data.response;

      // Completion check (would need active reference to module ID, which we can get if we load thread details)
      if (aiResponse.includes(`[[MODULE_COMPLETED:`)) {
          // Extract ID and complete
           const match = aiResponse.match(/\[\[MODULE_COMPLETED: (.+?)\]\]/);
           if (match && match[1]) {
               if (completeModule) await completeModule(match[1]);
               aiResponse = aiResponse.replace(match[0], "") + "\n\n✅ **MÓDULO DOMINADO!**";
           }
      }

      await addDoc(messagesRef, {
          role: 'model',
          content: aiResponse,
          createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-card border border-border rounded-xl shadow-lg overflow-hidden h-[600px]">
      
      {/* Sidebar - Thread List */}
      <div className="w-64 bg-muted/20 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
              <button 
                onClick={createNewThread}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-md font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                  <Plus className="h-4 w-4" />
                  Nova Conversa
              </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {threads.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => setActiveThreadId(t.id)}
                    className={cn(
                        "group flex items-center justify-between p-3 rounded-lg text-sm cursor-pointer transition-colors",
                        activeThreadId === t.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                      <div className="flex items-center gap-2 truncate cursor-pointer">
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{t.title}</span>
                      </div>
                      <button 
                        onClick={(e) => deleteThread(e, t.id)}
                        className={cn(
                            "p-1 transition-all rounded cursor-pointer",
                            deleteConfirm === t.id ? "text-red-500 opacity-100 bg-red-500/10" : "opacity-0 group-hover:opacity-100 hover:text-destructive"
                        )}
                        title="Apagar conversa"
                      >
                          <Trash2 className="h-3 w-3" />
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-full">
                        <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold">Poker Pro Mentor</h3>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                    <Bot className="h-12 w-12 mb-4" />
                    <p>Inicie uma nova conversa...</p>
                </div>
            ) : (
                messages.map((m) => (
                    <div key={m.id} className={cn("flex gap-3 max-w-[90%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                            {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={cn("p-4 rounded-xl text-sm leading-relaxed overflow-hidden shadow-sm", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted/40 border border-border/50")}>
                            {m.role === 'user' ? (
                                <p className="whitespace-pre-wrap">{m.content}</p>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:p-2 prose-pre:rounded-lg">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        urlTransform={(uri) => {
                                            if (uri.startsWith('image://')) return uri;
                                            return uri;
                                        }}
                                        components={{
                                            img: ({node, ...props}) => {
                                                // console.log("Markdown Img Component Called with src"); // Removed to fix TS build error
                                                const src = (props.src as string) || "";
                                                if (!src) return null;

                                                if (src.startsWith('image://')) {
                                                    const prompt = decodeURIComponent(src.replace('image://', ''));
                                                    return <GeneratedImage prompt={prompt} />;
                                                }
                                                return (
                                                    <span className="block my-4 rounded-lg overflow-hidden border border-border shadow-md">
                                                        <img {...props} src={src} alt={props.alt || "Generated Image"} className="w-full h-auto rounded-lg" loading="lazy" />
                                                    </span>
                                                )
                                            }
                                        }}
                                    >
                                        {parseContent(m.content)}
                                    </ReactMarkdown>
                                    
                                    {/* On-Demand Image Generation Button */}
                                    {!m.content.includes('[[IMAGE:') && !m.content.includes('[[GENERATE_IMAGE:') && !m.content.includes('![Generated Image]') && (
                                        <div className="mt-2 flex justify-end">
                                            <button 
                                                onClick={() => handleGenerateImage(m.id, m.content)}
                                                className="flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                                                title="Gerar visualização para esta explicação"
                                            >
                                                <ImageIcon className="h-3.5 w-3.5" />
                                                Gerar Visualização
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
            {loading && (
                <div className="flex gap-3 max-w-[85%]">
                    <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4" />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                </div>
            )}
        </div>

        {/* Input */}
        <div className="p-4 bg-background border-t border-border flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Pergunte sobre uma mão, estratégia ou conceito..."
                    className="flex-1 bg-input border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={activeThreadId === null} 
                />
                <button 
                    type="submit" 
                    disabled={loading || !input.trim() || activeThreadId === null}
                    className="bg-primary text-primary-foreground p-2 rounded-md hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                    <Send className="h-5 w-5" />
                </button>
            </form>
        </div>

      </div>
    </div>
  );
}
