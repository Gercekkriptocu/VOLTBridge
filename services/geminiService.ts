import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ''; // In a real app, ensure this is set securely.

// Initialize the client.
// Note: We check if the key exists to avoid crashing in dev environments without keys,
// but for the "world class" requirement, we assume it's provided or handled gracefully in UI.
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const getGeminiResponse = async (userMessage: string): Promise<string> => {
  if (!ai) {
    return "I'm sorry, my connection to the AI brain is currently unavailable. Please check your API key configuration.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: `You are an expert crypto bridge assistant for a DApp connecting Base (L2) and Solana. 
        Your goal is to help users understand how to bridge assets, explain fees, gas costs, and transaction times.
        
        Key Info:
        - Base: Ethereum L2, low fees, uses ETH for gas.
        - Solana: High throughput, uses SOL for gas.
        - Bridge Process: Requires 2 transactions (Source approval + Destination claim) or 1 transaction via relayer.
        - Typical time: 2-15 minutes depending on finality.
        - Fees: Network gas + Liquidity Provider fee (~0.05%).
        
        Keep answers concise, helpful, and friendly. Do not give financial advice.`
      }
    });
    
    return response.text || "I couldn't process that request right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error while thinking. Please try again later.";
  }
};