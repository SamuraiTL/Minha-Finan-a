
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Trash2, TrendingDown, DollarSign, 
  Loader2, LogOut, Home, BarChart2, Settings, 
  Home as HomeIcon, Coffee, Car, Utensils, 
  Heart, Briefcase, Zap, Book, Tv, Wallet, MoreHorizontal, Check,
  Menu, X, Bell, Info, PlusCircle
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense, Analysis, AppState } from './types';
import { analyzeFinances } from './services/geminiService';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'];

// Mapeamento de ícones para permitir salvamento no LocalStorage
const ICON_MAP: Record<string, React.ReactNode> = {
  'Moradia': <HomeIcon size={20} />,
  'Alimentação': <Utensils size={20} />,
  'Transporte': <Car size={20} />,
  'Contas Fixas': <Zap size={20} />,
  'Lazer': <Coffee size={20} />,
  'Saúde': <Heart size={20} />,
  'Educação': <Book size={20} />,
  'Assinaturas': <Tv size={20} />,
  'Investimento': <Wallet size={20} />,
  'Outros': <MoreHorizontal size={20} />,
  'Custom': <PlusCircle size={20} />
};

const INITIAL_CATEGORIES = [
  { name: 'Moradia', iconKey: 'Moradia', color: '#3b82f6', desc: 'Aluguel, luz, água' },
  { name: 'Alimentação', iconKey: 'Alimentação', color: '#f59e0b', desc: 'Mercado e delivery' },
  { name: 'Transporte', iconKey: 'Transporte', color: '#ef4444', desc: 'Combustível, Uber' },
  { name: 'Contas Fixas', iconKey: 'Contas Fixas', color: '#10b981', desc: 'Internet, celular' },
  { name: 'Lazer', iconKey: 'Lazer', color: '#8b5cf6', desc: 'Cinema, saídas' },
  { name: 'Saúde', iconKey: 'Saúde', color: '#ec4899', desc: 'Farmácia, consultas' },
  { name: 'Educação', iconKey: 'Educação', color: '#6366f1', desc: 'Cursos e livros' },
  { name: 'Assinaturas', iconKey: 'Assinaturas', color: '#14b8a6', desc: 'Netflix, Spotify' },
  { name: 'Investimento', iconKey: 'Investimento', color: '#059669', desc: 'Reserva e ações' },
  { name: 'Outros', iconKey: 'Outros', color: '#94a3b8', desc: 'Gastos diversos' },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [income, setIncome] = useState<number>(() => Number(localStorage.getItem('income')) || 0);
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('custom_categories_v2');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [activeCategory, setActiveCategory] = useState(categories[1] || categories[0]);
  const [accountDetail, setAccountDetail] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  // Fix: Added handleLogout function to properly handle user logout and clear authentication state.
  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('income', income.toString());
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    localStorage.setItem('custom_categories_v2', JSON.stringify(categories));
  }, [expenses, income, isLoggedIn, categories]);

  const totalExpenses = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  const balance = income - totalExpenses;
  const budgetProgress = income > 0 ? Math.min((totalExpenses / income) * 100, 100) : 0;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleCurrencyInput = (value: string, setter: (val: number) => void, stringSetter?: (val: string) => void) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    if (isNaN(floatValue)) {
      setter(0);
      if (stringSetter) stringSetter('');
    } else {
      setter(floatValue);
      if (stringSetter) stringSetter(formatBRL(floatValue));
    }
  };

  const addNewCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    // Evita duplicatas
    if (categories.some((c: any) => c.name.toLowerCase() === name.toLowerCase())) {
        setError("Esta conta já existe.");
        return;
    }
    const newCat = {
      name: name,
      iconKey: 'Custom',
      color: COLORS[categories.length % COLORS.length],
      desc: 'Conta Personalizada'
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    setActiveCategory(newCat);
    setNewCategoryName('');
    setIsAddingCategory(false);
    setIsSidebarOpen(false);
    setError(null);
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
    }
  };

  const addExpense = () => {
    const numericAmount = parseFloat(amountStr.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Insira um valor.");
      return;
    }
    
    const description = activeCategory.name === 'Contas Fixas' ? (accountDetail || 'Geral') : '';

    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      category: activeCategory.name,
      description,
      amount: numericAmount,
      icon: activeCategory.name,
      accountName: 'Manual',
      date: new Date().toLocaleDateString('pt-BR')
    };
    
    setExpenses([newExpense, ...expenses]);
    setAmountStr('');
    setAccountDetail('');
    setError(null);
  };

  const handleAnalyze = async () => {
    if (expenses.length === 0 || income <= 0) {
      setError("Preencha renda e gastos primeiro.");
      return;
    }
    setError(null);
    setAppState(AppState.LOADING);
    setActiveTab('stats');
    try {
      const result = await analyzeFinances(income, expenses);
      setAnalysis(result);
      setAppState(AppState.RESULT);
    } catch (err: any) {
      setError(err.message);
      setAppState(AppState.ERROR);
    }
  };

  const chartData = useMemo(() => {
    const grouped = expenses.reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});
    return Object.keys(grouped).map(name => ({ name, value: grouped[name] }));
  }, [expenses]);

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-full bg-white px-8 pt-24 animate-in fade-in duration-700">
        <div className="flex justify-center mb-12">
          <div className="w-24 h-24 bg-emerald-600 rounded-[32px] flex items-center justify-center shadow-2xl transform rotate-3 border-4 border-emerald-500/20">
            <DollarSign className="w-14 h-14 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-slate-800 text-center mb-2">Minha Finança</h1>
        <p className="text-slate-400 text-center mb-12 font-medium">Seu coach financeiro pessoal.</p>
        <button
          onClick={() => setIsLoggedIn(true)}
          className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold text-lg shadow-xl active:scale-95 transition-all"
        >
          Entrar no App
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-40 transition-opacity"
          onClick={() => { setIsSidebarOpen(false); setIsAddingCategory(false); }}
        />
      )}

      {/* Sidebar Drawer - GERENCIAR CONTAS (Categorias) */}
      <aside className={`absolute top-0 left-0 h-full w-[88%] bg-white z-50 shadow-2xl transition-transform duration-500 ease-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black">M</div>
              <span className="font-black text-slate-800 text-xl tracking-tighter">Minha Finança</span>
            </div>
            <button onClick={() => { setIsSidebarOpen(false); setIsAddingCategory(false); }} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pr-2">
            
            {/* Botão de Adicionar mais visível */}
            {!isAddingCategory ? (
                <button 
                    onClick={() => setIsAddingCategory(true)}
                    className="w-full flex items-center gap-3 p-5 rounded-3xl bg-emerald-50 border-2 border-dashed border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all mb-4"
                >
                    <PlusCircle size={24} className="text-emerald-600" />
                    <span className="font-black text-sm uppercase tracking-tight">Adicionar Nova Conta</span>
                </button>
            ) : (
                <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 space-y-4 mb-4 animate-in zoom-in-95 duration-300 shadow-2xl">
                   <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Nova Categoria/Conta</p>
                   <input 
                      type="text" 
                      placeholder="Nome (ex: Cartão de Crédito)"
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500"
                   />
                   <div className="flex gap-2">
                      <button onClick={addNewCategory} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black uppercase shadow-lg">Gravar Conta</button>
                      <button onClick={() => setIsAddingCategory(false)} className="bg-slate-700 text-slate-300 px-5 rounded-2xl text-xs font-black uppercase">Sair</button>
                   </div>
                </div>
            )}

            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 mb-2">Contas Registradas</p>
                {categories.map((opt: any) => (
                <button 
                    key={opt.name} 
                    onClick={() => { setActiveCategory(opt); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeCategory.name === opt.name ? 'bg-emerald-600 text-white shadow-xl scale-[1.02]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeCategory.name === opt.name ? 'bg-white/20' : 'bg-white shadow-sm text-slate-500'}`}>
                    {ICON_MAP[opt.iconKey] || ICON_MAP['Other']}
                    </div>
                    <div className="text-left flex-1">
                    <p className="font-black text-sm">{opt.name}</p>
                    <p className={`text-[10px] font-medium ${activeCategory.name === opt.name ? 'text-emerald-100' : 'text-slate-400'}`}>{opt.desc}</p>
                    </div>
                    {activeCategory.name === opt.name && <Check size={16} />}
                </button>
                ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
             <button 
                onClick={requestNotificationPermission}
                className={`w-full flex items-center justify-between p-5 rounded-[28px] border-2 transition-all ${notificationStatus === 'granted' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
             >
                <div className="flex items-center gap-3">
                   <Bell size={20} />
                   <span className="font-black text-xs uppercase">Dicas IA</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${notificationStatus === 'granted' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                   <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notificationStatus === 'granted' ? 'left-6' : 'left-1'}`} />
                </div>
             </button>

             <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 text-slate-400 font-bold text-sm hover:text-red-500 transition">
              <LogOut size={18} /> Sair do App
            </button>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="bg-emerald-600 pt-14 pb-10 px-6 text-white rounded-b-[48px] shadow-2xl z-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="flex justify-between items-center relative z-10 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg active:scale-90 transition">
              <Menu size={24} />
            </button>
            <div>
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Total</p>
              <h1 className="text-3xl font-black">{formatBRL(balance)}</h1>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg">
            <PlusCircle size={26} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="relative z-10 space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter opacity-80 px-1">
            <span>Uso Orçamentário</span>
            <span>{Math.round(budgetProgress)}%</span>
          </div>
          <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden p-[2px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${budgetProgress > 90 ? 'bg-red-400' : budgetProgress > 70 ? 'bg-amber-400' : 'bg-emerald-300 shadow-[0_0_10px_#6ee7b7]'}`}
              style={{ width: `${budgetProgress}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-48 scrollbar-hide">
        {activeTab === 'home' ? (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            {/* Income Input */}
            <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 group relative">
              <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Quanto você ganha p/ mês?</p>
              <input 
                type="text" 
                value={income > 0 ? formatBRL(income) : ''} 
                onChange={(e) => handleCurrencyInput(e.target.value, setIncome)}
                placeholder="R$ 0,00"
                className="text-2xl font-black text-slate-800 w-full bg-transparent focus:outline-none placeholder:text-slate-100"
              />
            </div>

            {/* Expenses List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-800 text-lg">Histórico de Lançamentos</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestão</span>
              </div>
              
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <div className="bg-white/50 rounded-[40px] py-16 text-center border-2 border-dashed border-slate-200 cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
                    <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="text-emerald-400" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm leading-relaxed">Não há gastos ainda. <br/> Escolha uma conta para começar!</p>
                  </div>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-slate-50 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          <Check size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{exp.category}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            {exp.description ? exp.description : exp.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-800 text-sm">{formatBRL(exp.amount)}</span>
                        <button onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))} className="text-slate-200 hover:text-red-500 transition-colors p-2">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
             {appState === AppState.RESULT ? (
               <div className="space-y-6">
                 <div className="bg-white p-7 rounded-[40px] shadow-sm border border-emerald-100">
                    <h3 className="text-emerald-600 font-black text-lg mb-4 flex items-center gap-2">
                      <Check className="w-5 h-5" /> Coach IA: Diagnóstico
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6">{analysis?.quickAnalysis}</p>
                    <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                        <p className="text-amber-900 text-[10px] font-black uppercase mb-1">Destaque Crítico</p>
                        <p className="text-amber-900/80 text-xs font-bold leading-tight">{analysis?.alert}</p>
                    </div>
                 </div>

                 <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl">
                    <h3 className="text-lg font-black mb-8 tracking-tight text-emerald-400">Plano de Ação</h3>
                    <div className="space-y-6">
                      {analysis?.actionPlan.map((step, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex-shrink-0 flex items-center justify-center text-[10px] font-black">{i+1}</div>
                          <p className="text-slate-300 text-xs leading-relaxed font-medium">{step}</p>
                        </div>
                      ))}
                    </div>
                 </div>
                 
                 <button onClick={() => setAppState(AppState.IDLE)} className="w-full py-5 rounded-3xl bg-white border-2 border-slate-100 text-slate-400 font-black text-xs uppercase tracking-widest shadow-sm">
                    Refazer Análise
                 </button>
               </div>
             ) : (
               <div className="space-y-8">
                 <div className="bg-white p-8 rounded-[40px] shadow-sm h-80 flex flex-col items-center justify-center">
                   <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-4">Composição por Conta</h3>
                   {expenses.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie data={chartData} innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value">
                            {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                        </RePieChart>
                     </ResponsiveContainer>
                   ) : (
                     <p className="text-slate-300 text-sm font-bold italic text-center">Inicie seus lançamentos para ver os dados</p>
                   )}
                 </div>

                 <button 
                  onClick={handleAnalyze}
                  disabled={appState === AppState.LOADING || expenses.length === 0}
                  className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50"
                 >
                   {appState === AppState.LOADING ? <Loader2 className="animate-spin" /> : <TrendingDown />}
                   {appState === AppState.LOADING ? 'O Coach IA está analisando...' : 'Pedir Ajuda do Coach IA'}
                 </button>
               </div>
             )}
          </div>
        )}
      </main>

      {/* Floating Entry Panel - AQUI VOCÊ ADICIONA O GASTO */}
      {activeTab === 'home' && (
        <div className="absolute bottom-24 left-6 right-6 z-20">
          <div className="bg-white p-5 rounded-[40px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] border border-slate-100 space-y-4 animate-in slide-in-from-bottom duration-500">
            
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    {ICON_MAP[activeCategory.iconKey] || ICON_MAP['Other']}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Conta Ativa</p>
                    <p className="text-sm font-black text-slate-800">{activeCategory.name}</p>
                  </div>
               </div>
               <button onClick={() => setIsSidebarOpen(true)} className="text-emerald-600 text-[10px] font-black uppercase bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
                 Mudar
               </button>
            </div>

            {error && <p className="text-red-500 text-[10px] font-black uppercase px-2 animate-pulse">{error}</p>}

            {activeCategory.name === 'Contas Fixas' && (
              <input 
                type="text" 
                placeholder="Nome da conta (ex: Luz, WiFi)"
                value={accountDetail}
                onChange={(e) => setAccountDetail(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-xs font-bold text-slate-600 placeholder:text-slate-300 outline-none focus:ring-1 focus:ring-emerald-200"
              />
            )}

            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="R$ 0,00"
                value={amountStr}
                onChange={(e) => handleCurrencyInput(e.target.value, () => {}, setAmountStr)}
                className="flex-1 bg-slate-50 border-none rounded-3xl px-6 text-2xl font-black text-slate-800 focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-200 outline-none"
              />
              <button 
                onClick={addExpense}
                className="bg-emerald-600 text-white w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl active:scale-90 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/40"
              >
                <Plus size={32} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl h-24 border-t border-slate-100 flex justify-around items-center px-8 z-30 pb-4">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-emerald-600' : 'text-slate-300'}`}
        >
          <div className={`p-3 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-emerald-50 shadow-inner' : ''}`}>
            <Home size={24} strokeWidth={activeTab === 'home' ? 3 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'stats' ? 'text-emerald-600' : 'text-slate-300'}`}
        >
          <div className={`p-3 rounded-2xl transition-all ${activeTab === 'stats' ? 'bg-emerald-50 shadow-inner' : ''}`}>
            <BarChart2 size={24} strokeWidth={activeTab === 'stats' ? 3 : 2} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Coach IA</span>
        </button>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-emerald-600"
        >
          <div className="p-3">
            <Menu size={24} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Contas</span>
        </button>
      </nav>
    </div>
  );
}