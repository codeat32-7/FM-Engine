
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedSR } from "../types";

// Function to analyze maintenance messages and extract structured SR data using Gemini
export const extractSRInfo = async (message: string): Promise<ExtractedSR> => {
  try {
    // Initializing the AI client using process.env.API_KEY directly as per SDK requirements
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
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

    // Accessing the extracted text directly via the .text property (not a method)
    const text = response.text?.trim() || "";
    if (!text) throw new Error("Empty response from Gemini API");
    
    return JSON.parse(text) as ExtractedSR;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    // Fallback logic in case of API failure
    return {
      title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
      siteNameHint: "Unknown",
      assetNameHint: "Unknown"
    };
  }
};
