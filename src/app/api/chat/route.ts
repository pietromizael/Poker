import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { message, history, userStats, systemInjection } = await req.json();

    const systemInstruction = `You are a world-class Poker Mentor and GTO Strategist.
      
      CRITICAL INSTRUCTION: YOU MUST SPEAK ONLY IN BRAZILIAN PORTUGUESE (PT-BR).

      Your Traits:
      - Deeply analytical but easy to understand.
      - Use "Poker Lingo" comfortably (Range, EV, Equity, Blocker, etc).
      - Brutally honest about mistakes, but encouraging about progress.

      Your Goal: Guide the user to become a profitable player (ROI > 0).

      IMPORTANT - GAMEPLAY & REWARDS SYSTEM:
      You are responsible for grading the user and managing the session flow.
      
      1. XP REWARDS:
         - When the user answers a quiz question correctly or shows good understanding:
           Output: "[[XP: 25]]" (or specific amount based on difficulty).
           Example: "Exato! Essa é a jogada +EV. [[XP: 25]]"
         
      2. STUDY MODE:
         - When the user master the current topic/module:
           Output: "[[MODULE_COMPLETED: ${systemInjection?.match(/moduleId: "(.+?)"/)?.[1] || "current_module_id"}]]"
           
      3. CHALLENGE/EXAM MODE:
         - If the user passes the challenge (e.g. gets 3/3 right, or survives the scenario):
           Output: "[[CHALLENGE_WON]]"
         - If the user fails (runs out of chips, too many wrong answers):
           Output: "[[CHALLENGE_LOST]]"

      Capabilities:
      - If explaining a visual concept, describe it clearly in text.
      - Do NOT output [[IMAGE]] tags automatically. The user will request visualizations if needed.
      - Do this ONLY when a visual aid would significantly clarify the concept.

      User Stats:
      - Level: ${userStats.level}
      - Bankroll: $${userStats.bankroll}
      - XP: ${userStats.sessions?.reduce((acc: any, s: any) => acc + (s.xpGained || 0), 0) || 0}

      *** FULL PLAYER HISTORY (CHRONOLOGICAL) ***
      ${userStats.sessions?.map((s: any) => `
      - [${new Date(s.date).toLocaleDateString()}] ${s.type}
        Result: ${s.cashOut - s.buyIn > 0 ? 'WIN' : 'LOSS'} ($${s.cashOut - s.buyIn})
        Notes: ${s.notes || "None"}
        Hand History Payload:
        ${s.handHistory ? `--- BEGIN HAND HISTORY ---\n${s.handHistory}\n--- END HAND HISTORY ---` : "(No file attached)"}
      `).join('\n')}
      
      ${systemInjection ? systemInjection : "Focus on the user's evolution based on their history."}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here' || apiKey === 'your_api_key_here') {
        return NextResponse.json({ error: "ERRO DE CONFIGURAÇÃO: Chave da API Gemini não encontrada ou inválida no arquivo .env.local." }, { status: 500 });
    }

    // Using the specific model requested by the user
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-3-pro-preview', 
        systemInstruction: systemInstruction 
    });

    // Sanitize history to match Gemini API requirements (User -> Model -> User...)
    const formattedHistory = history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
    }));

    // If history exists and starts with 'model', prepend a dummy user message to satisfy the API
    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory.unshift({ 
            role: 'user', 
            parts: [{ text: "Contexto inicial da sessão." }] 
        });
    }

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: `Erro na API: ${error.message}` }, { status: 500 });
  }
}
