
export type Platform = 'Meta Ads' | 'Google Ads';
export type ConnectionLevel = 'campanha' | 'conjunto';

export interface WeeklyReport {
  id: string;
  clientId: string;
  startDate: string;
  endDate: string;
  platform: Platform;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  businessType: string;
  niche: string;
  targetRoas: number;
  targetCpl: number;
  createdAt: string;
  isConnected: boolean;
  metaAccountId?: string;
  metaBmId?: string;
  connectionLevel?: ConnectionLevel;
}

export interface FunnelMetric {
  name: string;
  value: number;
  percentage: number;
  label: string;
  costPerUnit: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  platform: Platform | 'Geral';
  priority: 'Baixa' | 'Média' | 'Alta';
  isDone: boolean;
}

export interface FullAnalysis {
  funnelData: FunnelMetric[];
  actionPlan: ActionItem[];
  monthlyComparison: string;
  summary: string;
}
