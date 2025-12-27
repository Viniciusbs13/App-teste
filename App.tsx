
import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { FunnelChart } from './components/FunnelChart';
import { analyzeTrafficData, generateClientReportText } from './services/geminiService';
import { loginWithFacebook, fetchBusinessManagers, fetchAdAccounts, fetchInsights } from './services/metaAdsService';
import { Client, WeeklyReport, FullAnalysis, Platform, ConnectionLevel } from './types';
import { 
  Plus, DollarSign, Target, ShoppingCart, MessageSquare, 
  Loader2, ChevronRight, AlertCircle, CheckCircle2, 
  Lightbulb, TrendingUp, BarChart3, Briefcase, 
  Users, Layers, ArrowUpRight, ArrowDownRight, Trash2, CheckSquare, Square, Eye, MousePointer2,
  Facebook, Database, RefreshCw, Link as LinkIcon
} from 'lucide-react';

const INITIAL_CLIENTS: Client[] = [
  { 
    id: '1', 
    name: 'Exemplo Clínica Estética', 
    businessType: 'Serviço Local', 
    niche: 'Estética', 
    targetRoas: 3, 
    targetCpl: 15, 
    createdAt: '2024-01-01',
    isConnected: false 
  },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('adflow_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });
  const [reports, setReports] = useState<WeeklyReport[]>(() => {
    const saved = localStorage.getItem('adflow_reports');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [isAddingReport, setIsAddingReport] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isConnectingMeta, setIsConnectingMeta] = useState<string | null>(null); // ID do cliente
  const [reportText, setReportText] = useState<string | null>(null);

  // Estados para o Modal de Conexão Real
  const [metaAccessToken, setMetaAccessToken] = useState<string | null>(null);
  const [availableBMs, setAvailableBMs] = useState<any[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [isLoadingMetaList, setIsLoadingMetaList] = useState(false);

  useEffect(() => {
    localStorage.setItem('adflow_clients', JSON.stringify(clients));
    localStorage.setItem('adflow_reports', JSON.stringify(reports));
  }, [clients, reports]);

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  const clientReports = useMemo(() => 
    reports.filter(r => r.clientId === selectedClientId).sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ), [reports, selectedClientId]);

  const stats = useMemo(() => {
    if (clientReports.length === 0) return { spend: 0, leads: 0, sales: 0, cpl: 0, cr: 0, impressions: 0, cpm: 0, clicks: 0, ctr: 0 };
    const spend = clientReports.reduce((acc, r) => acc + r.spend, 0);
    const leads = clientReports.reduce((acc, r) => acc + r.leads, 0);
    const sales = clientReports.reduce((acc, r) => acc + r.sales, 0);
    const impressions = clientReports.reduce((acc, r) => acc + (r.impressions || 0), 0);
    const clicks = clientReports.reduce((acc, r) => acc + (r.clicks || 0), 0);
    
    return {
      spend,
      leads,
      sales,
      cpl: spend / (leads || 1),
      cr: (sales / (leads || 1)) * 100,
      impressions,
      clicks,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0
    };
  }, [clientReports]);

  // Fluxo de Conexão Real
  const handleStartMetaAuth = async () => {
    setIsLoadingMetaList(true);
    try {
      const token = await loginWithFacebook();
      setMetaAccessToken(token);
      const bms = await fetchBusinessManagers(token);
      setAvailableBMs(bms);
    } catch (error: any) {
      alert(`Erro na conexão: ${error.message || error}`);
    } finally {
      setIsLoadingMetaList(false);
    }
  };

  const handleBMSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bmId = e.target.value;
    if (!bmId || !metaAccessToken) return;
    setIsLoadingMetaList(true);
    try {
      const accounts = await fetchAdAccounts(bmId, metaAccessToken);
      setAvailableAccounts(accounts);
    } catch (error: any) {
      alert(`Erro ao carregar contas: ${error.message || error}`);
    } finally {
      setIsLoadingMetaList(false);
    }
  };

  const handleSyncData = async () => {
    if (!selectedClient?.metaAccountId || !metaAccessToken) {
      alert("Token expirado ou cliente não configurado corretamente. Reconecte o Facebook.");
      return;
    }
    setIsSyncing(true);
    try {
      const insights = await fetchInsights(selectedClient.metaAccountId, metaAccessToken);
      if (insights) {
        const newReport: WeeklyReport = {
          id: crypto.randomUUID(),
          clientId: selectedClient.id,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          platform: 'Meta Ads',
          spend: parseFloat(insights.spend),
          impressions: parseInt(insights.impressions),
          reach: parseInt(insights.reach),
          clicks: parseInt(insights.clicks),
          leads: 0, 
          sales: 0,
          revenue: 0,
        };
        setReports([newReport, ...reports]);
        alert("Dados da última semana sincronizados com sucesso!");
      } else {
        alert("Nenhum dado encontrado para os últimos 7 dias nesta conta.");
      }
    } catch (error: any) {
      alert(`Erro ao sincronizar: ${error.message || error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectMeta = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = isConnectingMeta;
    if (!clientId) return;

    setClients(clients.map(c => 
      c.id === clientId ? {
        ...c,
        isConnected: true,
        metaBmId: formData.get('bm') as string,
        metaAccountId: formData.get('account') as string,
        connectionLevel: formData.get('level') as ConnectionLevel
      } : c
    ));
    setIsConnectingMeta(null);
  };

  const deleteClient = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente e todos os dados vinculados?')) {
      const updatedClients = clients.filter(c => c.id !== id);
      setClients(updatedClients);
      setReports(reports.filter(r => r.clientId !== id));
      if (selectedClientId === id) {
        setSelectedClientId(updatedClients.length > 0 ? updatedClients[0].id : null);
      }
    }
  };

  const handleAddClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClient: Client = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      businessType: formData.get('type') as string,
      niche: formData.get('niche') as string,
      targetRoas: Number(formData.get('targetRoas')),
      targetCpl: Number(formData.get('targetCpl')),
      createdAt: new Date().toISOString(),
      isConnected: false
    };
    setClients([...clients, newClient]);
    setSelectedClientId(newClient.id);
    setIsAddingClient(false);
    setActiveTab('clients');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Layers className="text-blue-600" />
            <select 
              className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all"
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              {clients.length === 0 && <option value="">Nenhum cliente</option>}
            </select>
          </div>

          <div className="flex gap-3">
            {selectedClient?.isConnected && (
              <button 
                onClick={handleSyncData}
                disabled={isSyncing}
                className="bg-blue-50 text-blue-600 border border-blue-100 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 transition-all"
              >
                {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <Facebook size={16} />} 
                Puxar Dados Reais
              </button>
            )}
            <button 
              onClick={() => setIsAddingReport(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Plus size={16} /> Alimentar Semana
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Investimento" value={`R$ ${stats.spend.toLocaleString()}`} icon={<DollarSign size={18} />} color="blue" />
                <MetricCard title="CPM Médio" value={`R$ ${stats.cpm.toFixed(2)}`} icon={<Eye size={18} />} color="indigo" />
                <MetricCard title="CTR Médio" value={`${stats.ctr.toFixed(2)}%`} icon={<MousePointer2 size={18} />} color="sky" />
                <MetricCard title="CPL Médio" value={`R$ ${stats.cpl.toFixed(2)}`} icon={<Target size={18} />} color="violet" trend={stats.cpl <= (selectedClient?.targetCpl || 0) ? 'up' : 'down'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                      <BarChart3 size={20} className="text-blue-600" /> Histórico Semanal
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                        <tr>
                          <th className="px-8 py-4">Período</th>
                          <th className="px-8 py-4 text-center">Cliques</th>
                          <th className="px-8 py-4 text-center">Leads</th>
                          <th className="px-8 py-4 text-center">Vendas</th>
                          <th className="px-8 py-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {clientReports.map(report => (
                          <tr key={report.id} className="group hover:bg-slate-50 transition-all">
                            <td className="px-8 py-4 text-sm font-bold text-slate-700">
                              {new Date(report.startDate).toLocaleDateString()}
                            </td>
                            <td className="px-8 py-4 text-center text-sm font-medium">{report.clicks}</td>
                            <td className="px-8 py-4 text-center text-sm font-medium">{report.leads}</td>
                            <td className="px-8 py-4 text-center">
                              <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-full">
                                {report.sales}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-center">
                              <button 
                                onClick={() => {
                                  generateClientReportText(selectedClient!, report).then(setReportText);
                                  setActiveTab('reports');
                                }}
                                className="text-blue-600 hover:text-blue-800 font-black text-[10px] uppercase tracking-wider"
                              >
                                Copiar Copy
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col gap-6">
                  <h3 className="font-black text-slate-800 uppercase tracking-tighter">Status de Conexão</h3>
                  {selectedClient?.isConnected ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-500" />
                        <div>
                          <p className="text-xs font-black text-emerald-800 uppercase">Meta Ads Conectado</p>
                          <p className="text-[10px] text-emerald-600 truncate max-w-[150px]">ID: {selectedClient.metaAccountId}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Nível:</p>
                        <p className="text-sm font-bold capitalize">{selectedClient.connectionLevel}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-2xl text-center space-y-4">
                      <AlertCircle className="text-amber-500 mx-auto" />
                      <p className="text-xs font-bold text-amber-800">Conecte com o Meta para automação real.</p>
                      <button 
                        onClick={() => setIsConnectingMeta(selectedClient!.id)}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100"
                      >
                        Conectar Facebook Ads
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA MEUS CLIENTES */}
          {activeTab === 'clients' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Gestão de Clientes</h2>
                  <p className="text-slate-500 font-medium">Você tem {clients.length} clientes na base.</p>
                </div>
                <button 
                  onClick={() => setIsAddingClient(true)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus size={18} /> Adicionar Novo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map(c => (
                  <div key={c.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl transition-all group flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl shadow-lg ${c.isConnected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {c.isConnected ? <Facebook size={24} /> : <Database size={24} />}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedClientId(c.id); setActiveTab('dashboard'); }} className="text-blue-600 font-black text-[10px] uppercase hover:underline">Painel</button>
                        <button onClick={() => deleteClient(c.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    
                    <h4 className="text-xl font-black text-slate-800 mb-1">{c.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-4">{c.niche} • {c.businessType}</p>
                    
                    <div className="mt-auto space-y-4">
                      <div className="flex gap-4 pt-4 border-t border-slate-50">
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase">Meta CPL</p>
                          <p className="text-sm font-black text-slate-700">R$ {c.targetCpl}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase">Semanas</p>
                          <p className="text-sm font-black text-slate-700">{reports.filter(r => r.clientId === c.id).length}</p>
                        </div>
                      </div>

                      {c.isConnected ? (
                        <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase py-2.5 px-3 rounded-xl flex items-center justify-between border border-emerald-100">
                          Conectado via Meta API
                          <CheckCircle2 size={14} />
                        </div>
                      ) : (
                        <button 
                          onClick={() => setIsConnectingMeta(c.id)}
                          className="w-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all border border-slate-200"
                        >
                          <LinkIcon size={14} /> Conectar Facebook Ads
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {analysis ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-8">
                    <FunnelChart data={analysis.funnelData} />
                    
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tighter">
                        <MessageSquare className="text-blue-600" /> Radiografia do Estrategista
                      </h3>
                      <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-blue-600">
                        <p className="text-slate-700 font-medium leading-relaxed italic text-lg">
                          "{analysis.summary}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <h3 className="text-xl font-black text-slate-900 px-2 uppercase tracking-tight">O que fazer?</h3>
                    {analysis.actionPlan.map((action, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${action.priority === 'Alta' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tight">{action.title}</h4>
                            <p className="text-xs text-slate-500 leading-snug">{action.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <Target size={48} className="mx-auto text-slate-200 mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Radiografia Pendente</h3>
                  <button 
                    onClick={async () => {
                      if (!selectedClient || clientReports.length === 0) return alert("Adicione dados primeiro!");
                      setIsAnalyzing(true);
                      const res = await analyzeTrafficData(selectedClient, clientReports);
                      setAnalysis(res);
                      setIsAnalyzing(false);
                    }} 
                    className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest mt-4"
                  >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : "Iniciar Diagnóstico IA"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="max-w-2xl mx-auto py-12">
               {reportText ? (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
                    <h3 className="font-black uppercase text-lg">Report Pronto para Envio</h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(reportText);
                        alert('Copiado!');
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-xs font-black transition-all"
                    >
                      COPIAR
                    </button>
                  </div>
                  <div className="p-10 bg-slate-50">
                    <div className="bg-white p-8 rounded-2xl shadow-inner border border-slate-200 text-slate-800 leading-relaxed font-medium text-lg whitespace-pre-wrap">
                      {reportText}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-24 opacity-30">
                  <MessageSquare size={64} className="mx-auto mb-4" />
                  <p className="font-black uppercase text-sm tracking-widest">Nenhum report gerado ainda.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* MODAL CONEXÃO REAL FACEBOOK */}
      {isConnectingMeta && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-blue-600 p-8 text-white relative">
              <Facebook size={40} className="mb-4" />
              <h3 className="text-2xl font-black uppercase tracking-tight">Login no Facebook Ads</h3>
              <p className="text-blue-100 text-sm font-medium">Conecte sua BM para puxar dados automaticamente.</p>
              <button onClick={() => setIsConnectingMeta(null)} className="absolute top-8 right-8 text-white/50 hover:text-white">
                <Plus size={32} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {!metaAccessToken ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm mb-6">Você será redirecionado para o login seguro do Facebook.</p>
                  <button 
                    onClick={handleStartMetaAuth}
                    disabled={isLoadingMetaList}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 w-full shadow-xl shadow-blue-100 transition-all hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoadingMetaList ? <Loader2 className="animate-spin" size={20} /> : <Facebook size={20} />}
                    Login com Facebook
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectMeta} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Business Manager (BM)</label>
                    <select 
                      name="bm" 
                      required 
                      onChange={handleBMSelect}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      <option value="">Selecione sua BM...</option>
                      {availableBMs.map(bm => (
                        <option key={bm.id} value={bm.id}>{bm.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Conta de Anúncios</label>
                    <select 
                      name="account" 
                      required 
                      disabled={availableAccounts.length === 0}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none disabled:bg-slate-50"
                    >
                      <option value="">Selecione a Conta...</option>
                      {availableAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nível de Análise</label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="relative flex flex-col p-4 border rounded-2xl cursor-pointer hover:bg-slate-50 border-slate-200">
                        <input type="radio" name="level" value="campanha" defaultChecked className="absolute top-4 right-4" />
                        <span className="font-black text-xs uppercase text-slate-700">Geral</span>
                        <span className="text-[10px] text-slate-400">Toda a conta</span>
                      </label>
                      <label className="relative flex flex-col p-4 border rounded-2xl cursor-pointer hover:bg-slate-50 border-slate-200">
                        <input type="radio" name="level" value="conjunto" className="absolute top-4 right-4" />
                        <span className="font-black text-xs uppercase text-slate-700">Conjuntos</span>
                        <span className="text-[10px] text-slate-400">Detalhamento</span>
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Confirmar Configuração</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALIMENTAR SEMANA (MANUAL) */}
      {isAddingReport && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
             <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase">Input Semanal Manual</h3>
              <button onClick={() => setIsAddingReport(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={32} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={(e) => {
               e.preventDefault();
               const f = new FormData(e.currentTarget);
               const n: WeeklyReport = {
                 id: crypto.randomUUID(),
                 clientId: selectedClientId!,
                 startDate: f.get('start') as string,
                 endDate: f.get('end') as string,
                 platform: f.get('platform') as Platform,
                 spend: Number(f.get('spend')),
                 impressions: Number(f.get('imp')),
                 reach: Number(f.get('reach')),
                 clicks: Number(f.get('clk')),
                 leads: Number(f.get('ld')),
                 sales: Number(f.get('sl')),
                 revenue: Number(f.get('rev')),
               };
               setReports([n, ...reports]);
               setIsAddingReport(false);
            }} className="p-8 grid grid-cols-2 gap-4">
               <div className="col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Início</label>
                <input required name="start" type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Fim</label>
                <input required name="end" type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Gasto (R$)</label>
                    <input required name="spend" type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Impressões</label>
                    <input required name="imp" type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Cliques</label>
                    <input required name="clk" type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                 </div>
              </div>
              <div className="col-span-1 p-4 bg-blue-50 rounded-2xl">
                <label className="text-[10px] font-black text-blue-500 uppercase mb-2 block">Leads Gerados</label>
                <input required name="ld" type="number" className="w-full px-4 py-3 rounded-xl border-none shadow-sm" />
              </div>
              <div className="col-span-1 bg-emerald-50 p-4 rounded-2xl">
                <label className="text-[10px] font-black text-emerald-600 uppercase mb-2 block">Fechamentos</label>
                <input required name="sl" type="number" className="w-full px-4 py-3 rounded-xl border-none shadow-sm font-black text-emerald-700" placeholder="Quantos fechou?" />
              </div>
              <input type="hidden" name="reach" value="0" />
              <input type="hidden" name="platform" value="Meta Ads" />
              <input type="hidden" name="rev" value="0" />
              <button type="submit" className="col-span-2 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all">SALVAR SEMANA</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO CLIENTE */}
      {isAddingClient && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase">Novo Perfil</h3>
              <button onClick={() => setIsAddingClient(false)} className="text-slate-400 hover:text-slate-600"><Plus size={32} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleAddClient} className="p-8 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nome da Empresa</label>
                <input required name="name" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none" placeholder="Ex: Boutique X" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nicho</label>
                  <input required name="niche" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="Ex: Varejo" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tipo</label>
                  <select name="type" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none">
                    <option>Serviço Local</option>
                    <option>E-commerce</option>
                    <option>Infoprodutos</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl">
                <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block">CPL Alvo (R$)</label>
                <input required name="targetCpl" type="number" step="0.1" className="w-full px-4 py-3 rounded-xl border-none shadow-sm outline-none" />
              </div>
              <input type="hidden" name="targetRoas" value="0" />
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-4">CRIAR CLIENTE</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; trend?: 'up' | 'down' }> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden group">
    <div className={`absolute -right-2 -top-2 w-12 h-12 opacity-5 bg-${color}-600 rounded-full transition-transform group-hover:scale-150`}></div>
    <div className="flex justify-between items-center">
      <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{title}</span>
      <div className={`text-${color}-600`}>{icon}</div>
    </div>
    <div className="flex items-end gap-2">
      <span className="text-lg font-black text-slate-800">{value}</span>
      {trend && (
        <span className={`flex items-center text-[10px] font-bold mb-0.5 ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        </span>
      )}
    </div>
  </div>
);

export default App;
