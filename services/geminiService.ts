
import { GoogleGenAI, Type } from "@google/genai";
import { WeeklyReport, Client, FullAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTrafficData = async (client: Client, reports: WeeklyReport[]): Promise<FullAnalysis> => {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `
    Você é um Diretor de Estratégia Digital. Analise o funil de vendas do cliente "${client.name}".
    Nicho: ${client.niche}. 
    Métrica Alvo de CPL: R$${client.targetCpl}.
    
    Dados da Semana: ${JSON.stringify(reports)}
    
    Analise a saúde do funil seguindo esta lógica (Radiografia do Funil):
    1. CPM (Custo por Mil): O custo de atenção está caro?
    2. CTR (Taxa de Clique): O anúncio está chamando atenção? (Cliques / Impressões)
    3. ALCANCE -> LEADS: Se o CPL está alto, o erro é no criativo ou público?
    4. LEADS -> VENDAS (Fechamentos): Se tem muitos leads mas pouca venda, o erro é na qualidade do lead ou no time comercial do cliente?
    
    Gere um JSON com:
    - funnelData: 5 etapas (Impressões, Alcance, Cliques, Leads, Vendas).
    - actionPlan: 3 a 5 tarefas práticas para o gestor melhorar o resultado.
    - summary: Um parágrafo curto de diagnóstico direto ao ponto focando em CPM, CTR e Conversão Final.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          funnelData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.NUMBER },
                percentage: { type: Type.NUMBER },
                label: { type: Type.STRING },
                costPerUnit: { type: Type.NUMBER }
              },
              required: ["name", "value", "percentage", "label", "costPerUnit"]
            }
          },
          actionPlan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                platform: { type: Type.STRING },
                priority: { type: Type.STRING },
                isDone: { type: Type.BOOLEAN }
              },
              required: ["id", "title", "description", "platform", "priority", "isDone"]
            }
          },
          monthlyComparison: { type: Type.STRING },
          summary: { type: Type.STRING }
        },
        required: ["funnelData", "actionPlan", "monthlyComparison", "summary"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateClientReportText = async (client: Client, lastReport: WeeklyReport): Promise<string> => {
  const model = 'gemini-3-flash-preview';
  const cpm = (lastReport.spend / lastReport.impressions) * 1000;
  const ctr = (lastReport.clicks / lastReport.impressions) * 100;
  
  const prompt = `
    Escreva um relatório de desempenho semanal curto para o WhatsApp do cliente "${client.name}".
    Métricas Principais:
    - Gasto: R$${lastReport.spend}
    - CPM: R$${cpm.toFixed(2)}
    - CTR: ${ctr.toFixed(2)}%
    - Cliques: ${lastReport.clicks}
    - Leads: ${lastReport.leads}
    - CPL: R$${(lastReport.spend/lastReport.leads).toFixed(2)}
    - Fechamentos: ${lastReport.sales}
    
    Fale como um parceiro estratégico. Destaque pontos positivos e o que vamos otimizar. Use emojis.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
};
