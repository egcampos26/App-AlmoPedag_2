
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getEducationalSuggestions = async (itemName: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Como um especialista em pedagogia, sugira 3 atividades rápidas para realizar em sala de aula usando o seguinte recurso: ${itemName}. Descrição: ${description}. Retorne as sugestões em formato de lista simples.`,
    });
    return response.text || "Não foi possível gerar sugestões no momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Erro ao obter sugestões pedagógicas.";
  }
};
