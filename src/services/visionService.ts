import { GoogleGenAI } from "@google/genai";

const VISION_PROMPT = `
You are an appliance detection expert. Analyze this household photo and return **structured JSON only**.

Rules:
1. Identify **household appliances and electronics only**. Ignore cables, remotes, small accessories, furniture.
2. Common appliances: Mac mini, monitor, TV, microwave, fridge, aircon, water heater, router, laptop, smartphone charger, desk lamp, air purifier, gaming console, speaker, coffee machine.
3. For each detection:
   - name: exact device name (e.g. "Mac mini", not "computer")
   - estimated_wattage: typical power consumption in watts (e.g. 60 for Mac mini, 1200 for 1.5HP aircon)
   - confidence: 0.9 (high), 0.6 (medium), 0.3 (low)
4. If multiple identical items visible, use "count" property.
5. Singapore household context.

Return format (JSON only, no explanations):
{
  "appliances": [
    {
      "name": "Mac mini",
      "estimated_wattage": 60,
      "count": 2,
      "confidence": 0.95
    }
  ]
}
`;

export async function detectAppliances(base64Image: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] || base64Image
          }
        },
        { text: VISION_PROMPT }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result.appliances || [];
  } catch (error) {
    console.error("Vision detection error:", error);
    return [];
  }
}
