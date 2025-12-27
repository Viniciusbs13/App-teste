
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { FunnelMetric } from '../types';

interface FunnelChartProps {
  data: FunnelMetric[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ data }) => {
  // Cores graduais para as 5 etapas do funil
  const COLORS = ['#1e3a8a', '#1e40af', '#2563eb', '#60a5fa', '#10b981'];

  return (
    <div className="w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-8">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Radiografia do Funil</h3>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Análise completa da jornada do anúncio ao fechamento</p>
      </div>
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 120, left: 20, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={10} 
              fontWeight="900"
              tickLine={false} 
              axisLine={false} 
              width={100}
            />
            <Tooltip 
              cursor={{fill: '#f1f5f9'}}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={35}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList 
                dataKey="label" 
                position="right" 
                fill="#1e293b" 
                fontSize={10} 
                fontWeight="900" 
                offset={15} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-2 mt-8 pt-8 border-t border-slate-50">
        {data.map((metric, i) => (
          <div key={i} className="bg-slate-50 p-3 rounded-2xl text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{metric.name}</p>
            <p className="text-[11px] font-black text-slate-700">
              {metric.costPerUnit > 0 ? `R$ ${metric.costPerUnit.toFixed(2)}` : '--'}
            </p>
            <p className="text-[8px] font-bold text-slate-300 uppercase">Custo Médio</p>
          </div>
        ))}
      </div>
    </div>
  );
};
