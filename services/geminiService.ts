import { GoogleGenAI } from "@google/genai";

export const polishText = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found");
    return "API Key hilang. Tidak dapat membuat teks.";
  }

  // Initialize client here to ensure it uses the current API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Anda adalah editor ahli untuk blog pribadi. 
      Tolong poles teks berikut agar lebih ringkas, menarik, dan memiliki alur yang lebih baik, 
      sambil mempertahankan suara asli penulis.
      KEMBALIKAN HANYA TEKS YANG SUDAH DIPOLES DALAM BAHASA INDONESIA, tanpa penjelasan tambahan.
      
      Teks untuk dipoles:
      ${text}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Flash model doesn't need high thinking budget for this
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateSummary = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) return "API Key hilang.";

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Buatlah ringkasan singkat (excerpt) 1-2 kalimat yang menarik untuk posting blog berikut dalam BAHASA INDONESIA. 
            Jangan gunakan tanda kutip.
            
            Konten posting:
            ${text}`
        });
        return response.text || "";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "";
    }
}