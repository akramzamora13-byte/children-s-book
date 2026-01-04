
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { PageData } from "../types";

// Note: process.env.API_KEY is handled externally as per instructions
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateStoryStructure = async (theme: string): Promise<{ title: string; pages: PageData[] }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Create a 10-page children's story based on the theme: "${theme}". 
    For each page, provide a short text (1-3 sentences) suitable for a young child and a descriptive illustration prompt. 
    The story should be cohesive and engaging.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ["text", "imagePrompt"]
            }
          }
        },
        required: ["title", "pages"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return {
    title: data.title || "My Adventure",
    pages: data.pages.map((p: any, index: number) => ({
      ...p,
      id: `page-${index}-${Date.now()}`,
      isGeneratingImage: false
    }))
  };
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "4:3" | "16:9" = "1:1"): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A vibrant, friendly children's book illustration: ${prompt}` }]
    },
    config: {
      imageConfig: {
        aspectRatio
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data found in response");
};

export const editImage = async (base64Image: string, editPrompt: string): Promise<string> => {
  const ai = getAI();
  // Remove the data:image/png;base64, prefix for the API call
  const cleanBase64 = base64Image.split(',')[1];
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: 'image/png'
          }
        },
        { text: editPrompt }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to edit image");
};
