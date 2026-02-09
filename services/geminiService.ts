
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedSR } from "../types";

export const extractSRInfo = async (message: string): Promise<ExtractedSR> => {
  try {
    // Initialize inside the function to ensure process.env exists
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("Gemini API Key is missing. Check your Vercel Environment Variables.");
      return {
        title: message.slice(0, 30),
        siteNameHint: "Unknown",
        assetNameHint: "Unknown"
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract maintenance information from the following message: "${message}"`,
      config: {
        systemInstruction: "You are a helpful assistant for a CMMS system. Analyze a WhatsApp message and extract a concise title for a service request, and identify any hints for a 'site' or 'asset' mentioned. If not found, use 'Unknown'.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Short descriptive title of the issue." },
            siteNameHint: { type: Type.STRING, description: "Mentioned site or building name." },
            assetNameHint: { type: Type.STRING, description: "Mentioned equipment or asset name." },
          },
          required: ["title", "siteNameHint", "assetNameHint"]
        }
      }
    });

    const text = response.text || "";
    return JSON.parse(text.trim()) as ExtractedSR;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return {
      title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
      siteNameHint: "Unknown",
      assetNameHint: "Unknown"
    };
  }
};
