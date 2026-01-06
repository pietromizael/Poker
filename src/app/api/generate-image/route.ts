import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Force dynamic to prevent caching issues with image generation
export const dynamic = 'force-dynamic';

async function generateImageLogic(rawPrompt: string) {
    // 1. Force the model to generate an image
    // Ensure we handle empty prompts safely
    const basePrompt = rawPrompt || "Poker";
    const prompt = `Generate a high quality realistic poker image representing this scenario: ${basePrompt}`;
    
    console.log(`[ImgGen] Processing prompt: ${prompt.substring(0, 50)}...`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[ImgGen] Missing API Key");
        return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const imageModel = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

        const result = await imageModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const response = await result.response;
        
        // Extract Base64 from Candidate
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    console.log("[ImgGen] Gemini success! Returning image.");
                    const imgBuffer = Buffer.from(part.inlineData.data, 'base64');
                    // Return with LONG cache headers so the browser saves it locally
                    return new NextResponse(imgBuffer, {
                        headers: {
                            'Content-Type': part.inlineData.mimeType || 'image/png',
                            'Cache-Control': 'public, max-age=31536000, immutable'
                        }
                    });
                }
            }
        }
        
        // Safety / Stop reason check
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') throw new Error("Image blocked by Safety Filters.");
        
        throw new Error("Gemini response contained no image data.");

    } catch (error: any) {
        console.error(`[ImgGen] Error: ${error.message}`);
        
        // Fallback: Return Error Image
        try {
            const safeText = encodeURIComponent("GEMINI ERROR");
            // Use a red placeholder for errors
            const errorUrl = `https://placehold.co/800x450/450a0a/ff0000.png?text=${safeText}`;
            const res = await fetch(errorUrl);
            const blob = await res.arrayBuffer();
            return new NextResponse(blob, { headers: { 'Content-Type': 'image/png' } });
        } catch (e) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt') || '';
    return generateImageLogic(prompt);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        return generateImageLogic(body.prompt || '');
    } catch (e) {
        return generateImageLogic('');
    }
}
