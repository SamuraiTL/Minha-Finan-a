
import { GoogleGenAI, Type } from "@google/genai";
import { Expense, Analysis } from "../types";

export const analyzeFinances = async (income: number, expenses: Expense[]): Promise<Analysis> => {
  // Initialize the Gemini API client within the function to ensure the correct environment state is used.
  // Using the recommended model for text analysis tasks.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const expenseList = expenses.map(e => `${e.category}: R$ ${e.amount.toFixed(2)}`).join(', ');
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = income - totalExpenses;

  const prompt = `
    Atue como um Especialista em Finanças Pessoais (Coach Financeiro).
    Analise o seguinte cenário:
    Renda Mensal: R$ ${income.toFixed(2)}
    Gastos: ${expenseList}
    Saldo Atual: R$ ${balance.toFixed(2)}

    Siga rigorosamente estas regras:
    1. Não peça dados sensíveis.
    2. Identifique padrões de gastos excessivos.
    3. Sugira 3 metas acionáveis para o próximo mês.
    4. Mantenha um tom encorajador, profissional e direto ao ponto.
    5. Se o saldo for positivo, sugira opções de reserva de emergência. Se for negativo, sugira cortes prioritários.

    Responda obrigatoriamente no formato JSON solicitado.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quickAnalysis: { type: Type.STRING, description: "Resumo do cenário atual" },
            alert: { type: Type.STRING, description: "Onde o usuário está gastando demais" },
            actionPlan: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3 passos simples e acionáveis"
            },
            goldenTip: { type: Type.STRING, description: "Uma dica financeira clássica relevante ao contexto" }
          },
          required: ["quickAnalysis", "alert", "actionPlan", "goldenTip"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as Analysis;
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    throw new Error("Falha ao analisar as finanças. Tente novamente mais tarde.");
  }
};