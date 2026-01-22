
import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, Search, Package, History as HistoryIcon, LayoutDashboard, 
  LogOut, Info, CheckCircle, Clock, AlertCircle, Plus, ChevronRight, 
  Camera, Upload, FileSpreadsheet, X, Save, Trash2, Menu, Sparkles,
  ChevronLeft, ArrowLeftRight, User, ShieldCheck, ShieldAlert,
  ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import { PedagogicalItem, Transaction, ItemStatus, PedagogicalComponent } from './types';
import { INITIAL_ITEMS } from './constants';
import { getEducationalSuggestions } from './geminiService';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [items, setItems] = useState<PedagogicalItem[]>(() => {
    const saved = localStorage.getItem('pedagogical_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('pedagogical_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'inventory' | 'circulation' | 'history' | 'register'>('inventory');
  const [isAdmin, setIsAdmin] = useState(false); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<PedagogicalItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [teacherName, setTeacherName] = useState('');
  const [circulationFilter, setCirculationFilter] = useState<'retirada' | 'devolucao'>('retirada');
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Sorting State for History
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  // Registration Form State
  const [newItem, setNewItem] = useState<Partial<PedagogicalItem>>({
    name: '',
    category: '',
    description: '',
    location: '',
    quantity: 1,
    components: [],
    status: 'disponivel'
  });
  
  // Camera Modal State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    localStorage.setItem('pedagogical_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('pedagogical_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const handleTransaction = (item: PedagogicalItem, type: 'retirada' | 'devolucao', nameToUse?: string) => {
    const finalTeacherName = nameToUse || teacherName;
    
    if (type === 'retirada' && !finalTeacherName.trim()) {
      alert('Por favor, informe o nome do professor.');
      return;
    }

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      itemName: item.name,
      teacherName: type === 'retirada' ? finalTeacherName : (item.currentBorrower || 'N/A'),
      type,
      timestamp: Date.now(),
    };

    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          status: (type === 'retirada' ? 'emprestado' : 'disponivel') as ItemStatus,
          currentBorrower: type === 'retirada' ? finalTeacherName : undefined
        };
      }
      return i;
    });

    setItems(updatedItems);
    setTransactions([newTransaction, ...transactions]);
    setSelectedItem(null);
    setTeacherName('');
  };

  const loadSuggestions = async (item: PedagogicalItem) => {
    setLoadingSuggestions(true);
    setSuggestions(null);
    const result = await getEducationalSuggestions(item.name, item.description);
    setSuggestions(result);
    setLoadingSuggestions(false);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const circulationItems = filteredItems.filter(item => {
    if (circulationFilter === 'retirada') return item.status === 'disponivel';
    return item.status === 'emprestado';
  });

  // Sorting logic for history
  const sortedTransactions = [...transactions].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === undefined || bValue === undefined) return 0;

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Transaction }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />;
  };

  const openCamera = async () => {
    setShowCameraModal(true);
    try {
      setTimeout(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
      setShowCameraModal(false);
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        context.drawImage(videoRef.current, 0, 0, width, height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
        setCapturedImages(prev => [...prev, dataUrl]);
      }
    }
  };

  const removeCapturedImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const importedItems: PedagogicalItem[] = jsonData.map((row, index) => ({
        id: (items.length + index + 1).toString(),
        name: row.Nome || row.name || 'Sem Nome',
        category: row.Categoria || row.category || 'Geral',
        description: row.Descricao || row.description || '',
        images: row.Imagem ? [row.Imagem] : row.imageUrl ? [row.imageUrl] : ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400'],
        status: 'disponivel',
        location: row.Localizacao || row.location || 'Não Definido',
        quantity: parseInt(row.Quantidade || row.quantity || '1'),
        components: []
      }));

      setItems([...items, ...importedItems]);
      alert(`${importedItems.length} itens importados com sucesso!`);
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const saveNewItem = () => {
    if (!newItem.name || !newItem.category) {
      alert("Por favor, preencha o nome e a categoria.");
      return;
    }

    const itemToAdd: PedagogicalItem = {
      id: (items.length + 1).toString(),
      name: newItem.name || '',
      category: newItem.category || '',
      description: newItem.description || '',
      location: newItem.location || 'Almoxarifado Central',
      quantity: newItem.quantity || 1,
      images: capturedImages.length > 0 ? capturedImages : ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400'],
      status: 'disponivel',
      components: newItem.components || []
    };

    setItems([...items, itemToAdd]);
    setNewItem({
      name: '',
      category: '',
      description: '',
      location: '',
      quantity: 1,
      components: [],
      status: 'disponivel'
    });
    setCapturedImages([]);
    setActiveTab('inventory');
  };

  const addComponentRow = () => {
    const components = newItem.components || [];
    setNewItem({
      ...newItem,
      components: [...components, { id: Math.random().toString(), name: '', quantity: 1 }]
    });
  };

  const removeComponentRow = (id: string) => {
    const components = (newItem.components || []).filter(c => c.id !== id);
    setNewItem({ ...newItem, components });
  };

  const updateComponent = (id: string, field: keyof PedagogicalComponent, value: any) => {
    const components = (newItem.components || []).map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    setNewItem({ ...newItem, components });
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all ${
        activeTab === tab 
          ? 'bg-indigo-600 text-white font-semibold shadow-md scale-105 md:scale-100' 
          : 'text-indigo-200 hover:bg-indigo-600/50 hover:text-white'
      }`}
    >
      <Icon size={window.innerWidth < 768 ? 22 : 20} />
      <span className="text-[10px] md:text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 pb-20 md:pb-0">
      <aside className="w-64 bg-indigo-700 text-white hidden md:flex flex-col sticky top-0 h-screen shadow-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg tracking-tight">Almoxarifado</span>
        </div>
        
        <nav className="flex-1 mt-4 px-4 space-y-2">
          <NavItem tab="inventory" icon={Package} label="Acervo" />
          <NavItem tab="circulation" icon={ArrowLeftRight} label="Circulação" />
          <NavItem tab="history" icon={HistoryIcon} label="Histórico" />
        </nav>

        <div className="p-6 border-t border-indigo-600 space-y-2">
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${
                activeTab === 'register' 
                  ? 'bg-emerald-500 text-white font-semibold shadow-md' 
                  : 'text-emerald-100 hover:bg-emerald-500/30 hover:text-white'
              }`}
            >
              <Plus size={20} />
              <span className="text-sm">Cadastrar Item</span>
            </button>
          )}

          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className="flex items-center gap-3 text-indigo-200 hover:text-white transition-colors w-full px-4 py-2 text-xs opacity-70 hover:opacity-100"
          >
            {isAdmin ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            {isAdmin ? 'Modo: Administrador' : 'Modo: Professor'}
          </button>

          <button className="flex items-center gap-3 text-indigo-200 hover:text-white transition-colors w-full px-4 py-3">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-indigo-800 text-white border-t border-indigo-700 z-50 px-2 py-3 flex justify-around items-center shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
        <NavItem tab="inventory" icon={Package} label="Acervo" />
        <NavItem tab="circulation" icon={ArrowLeftRight} label="Circulação" />
        <NavItem tab="history" icon={HistoryIcon} label="Histórico" />
        {isAdmin && <NavItem tab="register" icon={Plus} label="Novo" />}
      </nav>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:hidden">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                {activeTab === 'inventory' ? <Package size={20} /> : activeTab === 'circulation' ? <ArrowLeftRight size={20} /> : activeTab === 'history' ? <HistoryIcon size={20} /> : <Plus size={20} />}
              </div>
              <h1 className="text-lg font-bold text-slate-800 truncate">
                {activeTab === 'inventory' && 'Acervo'}
                {activeTab === 'circulation' && 'Circulação'}
                {activeTab === 'history' && 'Histórico'}
                {activeTab === 'register' && 'Novo Material'}
              </h1>
            </div>

            <h1 className="hidden md:block text-xl font-bold text-slate-800">
              {activeTab === 'inventory' && 'Materiais Pedagógicos'}
              {activeTab === 'circulation' && 'Controle de Circulação'}
              {activeTab === 'history' && 'Movimentações Recentes'}
              {activeTab === 'register' && 'Cadastro de Materiais'}
            </h1>
            
            {(activeTab === 'inventory' || activeTab === 'history' || activeTab === 'circulation') && (
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full w-full md:w-64 focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'circulation' && (
            <div className="space-y-6">
              <div className="flex bg-slate-200 p-1 rounded-2xl w-full md:w-fit">
                <button 
                  onClick={() => setCirculationFilter('retirada')}
                  className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${circulationFilter === 'retirada' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Package size={18} /> Retirar Material
                </button>
                <button 
                  onClick={() => setCirculationFilter('devolucao')}
                  className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${circulationFilter === 'devolucao' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <HistoryIcon size={18} /> Devolver Material
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {circulationItems.length > 0 ? circulationItems.map(item => (
                  <div key={item.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                      <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{item.category}</span>
                        <h3 className="text-base font-bold text-slate-900 truncate">{item.name}</h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Info size={12} /> {item.location}
                        </p>
                      </div>

                      {circulationFilter === 'retirada' ? (
                        <div className="mt-3 space-y-2">
                          <input 
                            type="text" 
                            placeholder="Nome do Prof."
                            id={`teacher-input-${item.id}`}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 transition-all"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleTransaction(item, 'retirada', (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`teacher-input-${item.id}`) as HTMLInputElement;
                              handleTransaction(item, 'retirada', input.value);
                              input.value = '';
                            }}
                            className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors"
                          >
                            Confirmar Retirada
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                            <User size={14} className="text-amber-600" />
                            <span className="text-xs font-semibold text-amber-800 truncate">{item.currentBorrower}</span>
                          </div>
                          <button 
                            onClick={() => handleTransaction(item, 'devolucao')}
                            className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                          >
                            Confirmar Devolução
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                    <Package size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-medium">Nenhum material {circulationFilter === 'retirada' ? 'disponível' : 'emprestado'} no momento.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative h-40 md:h-48 overflow-hidden">
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-md ${item.status === 'disponivel' ? 'bg-emerald-500/90 text-white' : item.status === 'emprestado' ? 'bg-amber-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
                        {item.status.toUpperCase()}
                      </span>
                      <span className="bg-white/90 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm border border-indigo-100">
                        Qtd: {item.quantity}
                      </span>
                    </div>
                    {item.images.length > 1 && (
                      <div className="absolute bottom-2 left-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                        +{item.images.length - 1} fotos
                      </div>
                    )}
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="mb-2">
                      <span className="text-indigo-600 text-[10px] font-bold uppercase tracking-widest">{item.category}</span>
                      <h3 className="text-base md:text-lg font-bold text-slate-900 truncate">{item.name}</h3>
                    </div>
                    <p className="text-slate-500 text-xs md:text-sm line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                    <button onClick={() => { setSelectedItem(item); setActiveImageIndex(0); }} className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'register' && isAdmin && (
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 max-w-6xl mx-auto">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800">Novo Material</h2>
                  <button onClick={saveNewItem} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm">
                    <Save size={18} /> Salvar Tudo
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nome do Item</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all" 
                        placeholder="Ex: Laboratório de Robótica v1"
                        value={newItem.name}
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Área / Categoria</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                        placeholder="Ex: Física"
                        value={newItem.category}
                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Onde fica?</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                        placeholder="Ex: Armário 04"
                        value={newItem.location}
                        onChange={e => setNewItem({...newItem, location: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Quantidade do Item</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-center font-bold" 
                        value={newItem.quantity}
                        onChange={e => setNewItem({...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Descrição Pedagógica</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 text-sm resize-none" 
                      placeholder="Para que serve este material?"
                      value={newItem.description}
                      onChange={e => setNewItem({...newItem, description: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex flex-col">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Peças e Componentes Internos</label>
                      </div>
                      <button onClick={addComponentRow} className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full">
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {(newItem.components || []).length > 0 ? (newItem.components || []).map(comp => (
                        <div key={comp.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome da Peça</label>
                              <input 
                                type="text" 
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" 
                                placeholder="Ex: Sensor de Toque"
                                value={comp.name}
                                onChange={e => updateComponent(comp.id, 'name', e.target.value)}
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantidade</label>
                              <input 
                                type="number" 
                                min="1"
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-center font-semibold" 
                                value={comp.quantity}
                                onChange={e => updateComponent(comp.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              />
                            </div>
                            <button 
                              onClick={() => removeComponentRow(comp.id)} 
                              className="mt-5 p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors h-fit self-end"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-6 text-xs text-slate-400 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center gap-2">
                          <Package size={20} className="opacity-20" />
                          Nenhuma peça interna adicionada.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Camera size={20} className="text-indigo-600" /> Galeria de Fotos ({capturedImages.length})
                    </h3>
                    <button onClick={openCamera} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-xs flex items-center gap-2">
                      <Camera size={14} /> Tirar Foto
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {capturedImages.length > 0 ? capturedImages.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={img} className="w-full h-full object-cover" alt={`Capture ${idx}`} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => removeCapturedImage(idx)}
                            className="bg-rose-500 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-transform"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-2 aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-3 group hover:border-indigo-300 transition-colors cursor-pointer" onClick={openCamera}>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm group-hover:scale-110 transition-transform">
                          <Camera size={24} />
                        </div>
                        <p className="text-xs font-medium">Capture múltiplas fotos do item.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-600 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <FileSpreadsheet size={20} /> Carga em Lote
                  </h3>
                  <label className="block w-full cursor-pointer">
                    <div className="border-2 border-dashed border-indigo-400/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all text-center">
                      <Upload size={28} className="text-white" />
                      <span className="font-bold text-sm block">Excel / CSV</span>
                    </div>
                    <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50/50 border-b border-slate-200">
                    <tr>
                      <th 
                        className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => requestSort('timestamp')}
                      >
                        <div className="flex items-center gap-2">
                          Data / Hora <SortIcon columnKey="timestamp" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => requestSort('itemName')}
                      >
                        <div className="flex items-center gap-2">
                          Material <SortIcon columnKey="itemName" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => requestSort('teacherName')}
                      >
                        <div className="flex items-center gap-2">
                          Professor <SortIcon columnKey="teacherName" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group select-none text-right"
                        onClick={() => requestSort('type')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Ação <SortIcon columnKey="type" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                          {new Date(t.timestamp).toLocaleDateString('pt-BR')} {new Date(t.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm">{t.itemName}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">{t.teacherName}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${t.type === 'retirada' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {t.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sortedTransactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-24 text-center text-slate-400 italic">
                          <HistoryIcon size={48} className="mx-auto mb-4 opacity-10" />
                          <p>Nenhuma movimentação registrada.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-between p-6">
          <div className="w-full flex justify-between items-center z-10">
            <div className="text-white">
              <h3 className="font-bold text-lg">Câmera Almoxarifado</h3>
              <p className="text-[10px] uppercase text-white/60 tracking-widest">Capturadas: {capturedImages.length}</p>
            </div>
            <button onClick={closeCamera} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
              <X size={24} />
            </button>
          </div>
          <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10 flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <div className="w-full max-w-2xl flex items-center justify-between px-4 pb-8 z-10">
            <div className="w-16 h-16 rounded-xl border border-white/20 overflow-hidden bg-white/10">
              {capturedImages.length > 0 && <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" alt="Last" />}
            </div>
            <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl active:scale-90 transition-transform">
              <div className="w-full h-full border-4 border-slate-900 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-indigo-600 rounded-full"></div>
              </div>
            </button>
            <button onClick={closeCamera} className="px-6 py-2 bg-white text-slate-900 rounded-full font-bold shadow-lg hover:bg-slate-100 transition-colors text-sm">Pronto</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative h-64 md:h-72 overflow-hidden shrink-0 group/gallery">
              <img src={selectedItem.images[activeImageIndex]} alt={selectedItem.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {selectedItem.images.length > 1 && (
                <>
                  <button onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : selectedItem.images.length - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity">
                    <ChevronLeft size={24} />
                  </button>
                  <button onClick={() => setActiveImageIndex(prev => prev < selectedItem.images.length - 1 ? prev + 1 : 0)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity">
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              <button onClick={() => { setSelectedItem(null); setSuggestions(null); }} className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white p-2.5 rounded-full shadow-lg">
                <X size={20} />
              </button>
              
              <div className="absolute bottom-4 left-6 right-6">
                <span className="text-indigo-300 font-bold text-[10px] uppercase tracking-[0.2em] mb-1 block">{selectedItem.category}</span>
                <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedItem.name}</h2>
              </div>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-900 uppercase">Estoque</span>
                    <span className="text-xl font-black text-indigo-700">{selectedItem.quantity}</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Descrição</h3>
                    <p className="text-slate-600 text-sm">{selectedItem.description}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Kit</h3>
                    <div className="space-y-2">
                      {selectedItem.components.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-700 font-medium">{c.name}</span>
                          <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-indigo-600">x{c.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                      <Layout size={18} className="text-indigo-600" /> IA Pedagógica
                    </h3>
                    {!suggestions ? (
                      <button onClick={() => loadSuggestions(selectedItem)} disabled={loadingSuggestions} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:bg-slate-300 shadow-md">
                        {loadingSuggestions ? 'Gerando...' : 'Sugestões de Uso'}
                      </button>
                    ) : (
                      <div className="text-xs text-slate-600 italic bg-white p-3 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                        {suggestions}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    {selectedItem.status === 'disponivel' ? (
                      <div className="space-y-3">
                        <input type="text" placeholder="Nome do Professor" className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm outline-none" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                        <button onClick={() => handleTransaction(selectedItem, 'retirada')} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all">Confirmar Retirada</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                          <p className="font-bold text-slate-800">{selectedItem.currentBorrower}</p>
                        </div>
                        <button onClick={() => handleTransaction(selectedItem, 'devolucao')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl">Confirmar Devolução</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
