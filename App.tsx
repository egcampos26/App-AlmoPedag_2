
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Layout, Search, Package, History as HistoryIcon, LayoutDashboard, 
  LogOut, Info, CheckCircle, Clock, AlertCircle, Plus, ChevronRight, 
  Camera, Upload, FileSpreadsheet, X, Save, Trash2, Menu, Sparkles,
  ChevronLeft, ArrowLeftRight, User, ShieldCheck, ShieldAlert,
  ArrowUp, ArrowDown, ArrowUpDown, Download, Filter, Layers, Edit2,
  Settings, LogIn, Hammer, Wrench, ZoomIn
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

  const [activeTab, setActiveTab] = useState<'inventory' | 'circulation' | 'history' | 'register' | 'maintenance'>('inventory');
  const [isAdmin, setIsAdmin] = useState(false); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedItem, setSelectedItem] = useState<PedagogicalItem | null>(null);
  const [editingItem, setEditingItem] = useState<PedagogicalItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [teacherName, setTeacherName] = useState('');
  const [circulationFilter, setCirculationFilter] = useState<'retirada' | 'devolucao'>('retirada');
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Maintenance Modal States
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [itemPendingMaintenance, setItemPendingMaintenance] = useState<PedagogicalItem | null>(null);
  const [defectDescription, setDefectDescription] = useState('');
  const [defectPhotos, setDefectPhotos] = useState<string[]>([]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  const [newItem, setNewItem] = useState<Partial<PedagogicalItem>>({
    name: '',
    category: '',
    description: '',
    location: '',
    quantity: 1,
    components: [],
    status: 'disponivel'
  });
  
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<'new' | 'edit' | 'defect'>('new');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    localStorage.setItem('pedagogical_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('pedagogical_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const categories = useMemo(() => {
    const uniqueCats = Array.from(new Set(items.map(item => item.category)));
    return ['Todos', ...uniqueCats.sort()];
  }, [items]);

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

  const openMaintenanceModal = (item: PedagogicalItem) => {
    setItemPendingMaintenance(item);
    setDefectDescription('');
    setDefectPhotos([]);
    setIsMaintenanceModalOpen(true);
  };

  const confirmMaintenance = () => {
    if (!itemPendingMaintenance) return;
    if (!defectDescription.trim()) {
      alert('Por favor, descreva o defeito ou motivo da manutenção.');
      return;
    }

    const updatedItems = items.map(i => {
      if (i.id === itemPendingMaintenance.id) {
        return {
          ...i,
          status: 'manutencao' as ItemStatus,
          currentBorrower: undefined,
          defectDescription: defectDescription,
          defectImages: defectPhotos
        };
      }
      return i;
    });

    setItems(updatedItems);

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: itemPendingMaintenance.id,
      itemName: itemPendingMaintenance.name,
      teacherName: 'Sistema (Manutenção)',
      type: 'retirada', 
      timestamp: Date.now(),
      notes: `Defeito: ${defectDescription}`
    };
    
    setTransactions([newTransaction, ...transactions]);
    setIsMaintenanceModalOpen(false);
    setItemPendingMaintenance(null);
    setSelectedItem(null);
  };

  const handleMaintenanceReturn = (item: PedagogicalItem) => {
    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          status: 'disponivel' as ItemStatus,
          currentBorrower: undefined,
          defectDescription: undefined,
          defectImages: undefined
        };
      }
      return i;
    });

    setItems(updatedItems);

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      itemName: item.name,
      teacherName: 'Sistema (Retorno)',
      type: 'devolucao',
      timestamp: Date.now(),
      notes: 'Item retornou da manutenção.'
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const loadSuggestions = async (item: PedagogicalItem) => {
    setLoadingSuggestions(true);
    setSuggestions(null);
    const result = await getEducationalSuggestions(item.name, item.description);
    setSuggestions(result);
    setLoadingSuggestions(false);
  };

  const filteredItems = items.filter(item => {
    if (item.status === 'manutencao') return false;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const circulationItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = circulationFilter === 'retirada' ? item.status === 'disponivel' : item.status === 'emprestado';
    return matchesSearch && matchesStatus;
  });

  const maintenanceItems = items.filter(item => item.status === 'manutencao');

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue === undefined || bValue === undefined) return 0;
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!jsonData || jsonData.length === 0) {
          alert("O arquivo está vazio ou não pôde ser lido corretamente.");
          return;
        }

        const normalizeStr = (str: string) => 
          str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const importedItems: PedagogicalItem[] = jsonData.map((row, index) => {
          const findVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => keys.includes(normalizeStr(k)));
            return foundKey ? row[foundKey] : null;
          };

          const name = findVal(['nome', 'item', 'material', 'name', 'titulo']) || 'Item Sem Nome';
          const category = findVal(['categoria', 'area', 'category', 'tipo']) || 'Geral';
          const desc = findVal(['descricao', 'detalhes', 'description', 'obs']) || '';
          const qty = parseInt(findVal(['quantidade', 'qtd', 'quantity', 'estoque', 'unidades']) || '1');
          const loc = findVal(['localizacao', 'local', 'sala', 'armario', 'posicao', 'location']) || 'Almoxarifado';
          const img = findVal(['imagem', 'foto', 'url', 'image', 'link']) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400';

          return {
            id: `import-${Date.now()}-${index}`,
            name: String(name),
            category: String(category),
            description: String(desc),
            images: [String(img)],
            status: 'disponivel',
            location: String(loc),
            quantity: isNaN(qty) ? 1 : qty,
            components: []
          };
        });

        setItems(prev => [...prev, ...importedItems]);
        alert(`Sucesso! ${importedItems.length} materiais foram adicionados ao acervo.`);
        e.target.value = ''; 
      } catch (err) {
        console.error("Erro na importação:", err);
        alert("Falha ao processar o arquivo. Verifique se o formato está correto (Excel ou CSV).");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Nome: "Microscópio Modelo X",
        Categoria: "Ciências",
        Descricao: "Microscópio para aulas de biologia",
        Quantidade: 5,
        Localizacao: "Armário B",
        Imagem: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Materiais");
    XLSX.writeFile(wb, "modelo_importacao_almoxarifado.xlsx");
  };

  const openCamera = async (mode: 'new' | 'edit' | 'defect' = 'new') => {
    setCameraMode(mode);
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
        
        if (cameraMode === 'edit' && editingItem) {
          setEditingItem({ ...editingItem, images: [...editingItem.images, dataUrl] });
        } else if (cameraMode === 'defect') {
          setDefectPhotos(prev => [...prev, dataUrl]);
        } else {
          setCapturedImages(prev => [...prev, dataUrl]);
        }
      }
    }
  };

  const removeCapturedImage = (index: number) => {
    if (editingItem) {
      const newImages = editingItem.images.filter((_, i) => i !== index);
      setEditingItem({ ...editingItem, images: newImages });
    } else {
      setCapturedImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const saveNewItem = () => {
    if (!newItem.name || !newItem.category) {
      alert("Por favor, preencha o nome e a categoria.");
      return;
    }

    const itemToAdd: PedagogicalItem = {
      id: (items.length + 1).toString() + '-' + Date.now(),
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

  const updateItem = () => {
    if (!editingItem) return;
    if (!editingItem.name || !editingItem.category) {
      alert("Nome e categoria são obrigatórios.");
      return;
    }
    
    setItems(items.map(i => i.id === editingItem.id ? editingItem : i));
    setEditingItem(null);
    alert("Item atualizado com sucesso!");
  };

  const addComponentRow = () => {
    if (editingItem) {
      const components = editingItem.components || [];
      setEditingItem({
        ...editingItem,
        components: [...components, { id: Math.random().toString(), name: '', quantity: 1 }]
      });
    } else {
      const components = newItem.components || [];
      setNewItem({
        ...newItem,
        components: [...components, { id: Math.random().toString(), name: '', quantity: 1 }]
      });
    }
  };

  const removeComponentRow = (id: string) => {
    if (editingItem) {
      const components = editingItem.components.filter(c => c.id !== id);
      setEditingItem({ ...editingItem, components });
    } else {
      const components = (newItem.components || []).filter(c => c.id !== id);
      setNewItem({ ...newItem, components });
    }
  };

  const updateComponent = (id: string, field: keyof PedagogicalComponent, value: any) => {
    if (editingItem) {
      const components = editingItem.components.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      );
      setEditingItem({ ...editingItem, components });
    } else {
      const components = (newItem.components || []).map(c => 
        c.id === id ? { ...c, [field]: value } : c
      );
      setNewItem({ ...newItem, components });
    }
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all h-10 ${
        activeTab === tab 
          ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-medium whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header / Menu */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
                <Package className="w-6 h-6" />
              </div>
              <div className="hidden lg:block">
                <span className="font-black text-xl text-slate-900 tracking-tight leading-none block">Almoxarifado</span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Pedagógico</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2 ml-4">
              <NavItem tab="inventory" icon={Package} label="Acervo" />
              <NavItem tab="circulation" icon={ArrowLeftRight} label="Circulação" />
              <NavItem tab="history" icon={HistoryIcon} label="Histórico" />
              {isAdmin && <NavItem tab="maintenance" icon={Hammer} label="Manutenção" />}
              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('register')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all h-10 ${
                    activeTab === 'register' 
                      ? 'bg-emerald-600 text-white font-semibold' 
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">Cadastrar</span>
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-6 flex-1 md:flex-none justify-end">
            {(activeTab === 'inventory' || activeTab === 'history' || activeTab === 'circulation' || activeTab === 'maintenance') && (
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full w-48 lg:w-64 focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3 border-l border-slate-200 pl-4 md:pl-6">
              <button 
                onClick={() => setIsAdmin(!isAdmin)}
                className={`p-2.5 rounded-xl transition-all ${
                  isAdmin ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={isAdmin ? "Modo Administrador" : "Modo Professor"}
              >
                {isAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
              </button>
              
              <button className="hidden sm:flex p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <LogOut size={20} />
              </button>

              <div className="sm:hidden">
                 <button className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl">
                   <Menu size={20} />
                 </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[100] px-4 py-3 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 ${activeTab === 'inventory' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Package size={22} />
          <span className="text-[10px] font-bold">Acervo</span>
        </button>
        <button onClick={() => setActiveTab('circulation')} className={`flex flex-col items-center gap-1 ${activeTab === 'circulation' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <ArrowLeftRight size={22} />
          <span className="text-[10px] font-bold">Circulação</span>
        </button>
        {isAdmin && (
          <button onClick={() => setActiveTab('maintenance')} className={`flex flex-col items-center gap-1 ${activeTab === 'maintenance' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <Hammer size={22} />
            <span className="text-[10px] font-bold">Conserto</span>
          </button>
        )}
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <HistoryIcon size={22} />
          <span className="text-[10px] font-bold">Histórico</span>
        </button>
        {isAdmin && (
          <button onClick={() => setActiveTab('register')} className={`flex flex-col items-center gap-1 ${activeTab === 'register' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Plus size={22} />
            <span className="text-[10px] font-bold">Novo</span>
          </button>
        )}
      </nav>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 md:p-8 pb-24 md:pb-8">
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Materiais Disponíveis</h2>
                <p className="text-slate-500 text-sm mt-1">Explore e gerencie o acervo pedagógico da instituição.</p>
              </div>
            </div>

            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600 text-white shadow-md scale-105' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.length > 0 ? filteredItems.map(item => (
                <div key={item.id} className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                  <div className="relative h-52 overflow-hidden">
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                        className="absolute top-4 left-4 bg-white/95 text-indigo-600 p-2.5 rounded-xl shadow-lg hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 z-10"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}

                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md uppercase tracking-wider ${item.status === 'disponivel' ? 'bg-emerald-500/90 text-white' : item.status === 'emprestado' ? 'bg-amber-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
                        {item.status}
                      </span>
                      <span className="bg-white/95 text-indigo-700 text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-sm border border-indigo-100 uppercase tracking-tighter">
                        Qtd: {item.quantity}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-3">
                      <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">{item.category}</span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-6 h-8">{item.description}</p>
                    <button onClick={() => { setSelectedItem(item); setActiveImageIndex(0); }} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                      Detalhes do Material
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-32 text-center text-slate-400 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                  <Package size={64} className="mx-auto mb-6 opacity-20" />
                  <p className="font-bold text-lg">Nenhum material encontrado.</p>
                  <p className="text-sm">Tente ajustar seus filtros ou busca.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'circulation' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Fluxo de Materiais</h2>
              <p className="text-slate-500 text-sm mt-1">Gerencie as retiradas e devoluções diárias.</p>
            </div>

            <div className="flex bg-slate-200 p-1.5 rounded-2xl w-full md:w-fit shadow-inner">
              <button 
                onClick={() => setCirculationFilter('retirada')}
                className={`flex-1 md:flex-none px-10 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${circulationFilter === 'retirada' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Package size={18} /> Retirar
              </button>
              <button 
                onClick={() => setCirculationFilter('devolucao')}
                className={`flex-1 md:flex-none px-10 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${circulationFilter === 'devolucao' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <HistoryIcon size={18} /> Devolver
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {circulationItems.length > 0 ? circulationItems.map(item => (
                <div key={item.id} className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex gap-5">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                    <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{item.category}</span>
                      <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">{item.name}</h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <Info size={12} className="text-slate-400" /> {item.location}
                      </p>
                    </div>

                    {circulationFilter === 'retirada' ? (
                      <div className="mt-4 space-y-2">
                        <input 
                          type="text" 
                          placeholder="Professor"
                          id={`teacher-input-${item.id}`}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById(`teacher-input-${item.id}`) as HTMLInputElement;
                            handleTransaction(item, 'retirada', input.value);
                            input.value = '';
                          }}
                          className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                        >
                          Confirmar Retirada
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        <div className="px-3 py-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                          <User size={14} className="text-amber-600" />
                          <span className="text-xs font-bold text-amber-800 truncate">{item.currentBorrower}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleTransaction(item, 'devolucao')}
                            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-100 transition-all active:scale-95"
                          >
                            Devolver
                          </button>
                          <button 
                            onClick={() => openMaintenanceModal(item)}
                            className="w-10 h-10 shrink-0 bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center justify-center group relative"
                          >
                            <Hammer size={16} />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 font-black uppercase tracking-widest border border-white/10 shadow-xl">
                              Reparo
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-24 text-center text-slate-400 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                  <Package size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-bold">Nenhum item pendente para {circulationFilter}.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && isAdmin && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Itens em Manutenção</h2>
                <p className="text-slate-500 text-sm mt-1">Materiais que aguardam reparo ou revisão técnica.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertCircle size={18} className="text-rose-500" />
                <span className="text-xs font-bold text-rose-700">{maintenanceItems.length} materiais em reparo</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {maintenanceItems.length > 0 ? maintenanceItems.map(item => (
                <div key={item.id} className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="relative h-48 overflow-hidden group/maint">
                    <img src={item.defectImages && item.defectImages.length > 0 ? item.defectImages[0] : item.images[0]} alt={item.name} className="w-full h-full object-cover grayscale opacity-60" />
                    <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center">
                       <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-2xl">
                          <Wrench size={32} className="text-rose-600 animate-pulse" />
                       </div>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="mb-4 space-y-3">
                      <div>
                        <span className="text-rose-600 text-[10px] font-black uppercase tracking-[0.2em]">Status: Manutenção</span>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{item.name}</h3>
                      </div>
                      
                      {item.defectDescription && (
                        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertCircle size={10} /> Defeito Relatado:</p>
                          <p className="text-slate-700 text-xs italic line-clamp-3 leading-relaxed">{item.defectDescription}</p>
                        </div>
                      )}

                      {item.defectImages && item.defectImages.length > 0 && (
                        <div className="flex flex-col gap-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fotos do Problema:</p>
                           <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                             {item.defectImages.map((img, idx) => (
                               <button 
                                 key={idx} 
                                 onClick={() => setExpandedImage(img)}
                                 className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-rose-100 shadow-sm relative group/thumb overflow-hidden"
                               >
                                 <img src={img} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                                 <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                    <ZoomIn size={14} className="text-white" />
                                 </div>
                               </button>
                             ))}
                           </div>
                        </div>
                      )}

                      <p className="text-slate-500 text-[10px] italic leading-relaxed">Local original: {item.location}</p>
                    </div>
                    <button 
                      onClick={() => handleMaintenanceReturn(item)}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Concluir Reparo
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-32 text-center text-slate-400 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                  <CheckCircle size={64} className="mx-auto mb-6 opacity-10" />
                  <p className="font-bold text-lg text-slate-500">Tudo em ordem!</p>
                  <p className="text-sm">Nenhum material está em manutenção no momento.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'register' && isAdmin && (
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-[1200px] mx-auto animate-in zoom-in-95 duration-500">
            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-200 space-y-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-900">Novo Material</h2>
                <button onClick={saveNewItem} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-sm">
                  <Save size={18} /> Salvar Item
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Título do Material</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all shadow-inner" 
                      placeholder="Ex: Kit de Robótica Arduino v3"
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-inner" 
                        placeholder="Ex: Física"
                        value={newItem.category}
                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quantidade</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold shadow-inner" 
                        value={newItem.quantity}
                        onChange={e => setNewItem({...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Localização no Almoxarifado</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-inner" 
                      placeholder="Ex: Estante 12, Nível B"
                      value={newItem.location}
                      onChange={e => setNewItem({...newItem, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Descrição Detalhada</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none h-28 text-sm resize-none shadow-inner" 
                      placeholder="Descreva as finalidades e cuidados do material..."
                      value={newItem.description}
                      onChange={e => setNewItem({...newItem, description: e.target.value})}
                    ></textarea>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Componentes Internos</label>
                    <button onClick={addComponentRow} className="text-indigo-600 text-[10px] font-black hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-4 py-1.5 rounded-full transition-colors uppercase tracking-widest">
                      <Plus size={12} /> Adicionar Peça
                    </button>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {(newItem.components || []).length > 0 ? (newItem.components || []).map(comp => (
                      <div key={comp.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-2">
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-white border border-slate-100 rounded-xl text-xs font-medium" 
                          placeholder="Nome da peça"
                          value={comp.name}
                          onChange={e => updateComponent(comp.id, 'name', e.target.value)}
                        />
                        <input 
                          type="number" 
                          min="1"
                          className="w-16 p-2 bg-white border border-slate-100 rounded-xl text-xs text-center font-bold" 
                          value={comp.quantity}
                          onChange={e => updateComponent(comp.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button onClick={() => removeComponentRow(comp.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center gap-2">
                        <Package size={24} className="opacity-20" />
                        Nenhum componente listado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Camera size={20} className="text-indigo-600" /> Galeria de Mídia ({capturedImages.length})
                  </h3>
                  <button onClick={() => openCamera('new')} className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all text-xs flex items-center gap-2 shadow-lg">
                    <Camera size={14} /> Nova Foto
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {capturedImages.length > 0 ? capturedImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-3xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:ring-4 hover:ring-indigo-100">
                      <img src={img} className="w-full h-full object-cover" alt={`Capture ${idx}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <button 
                          onClick={() => removeCapturedImage(idx)}
                          className="bg-rose-500 text-white p-3 rounded-full shadow-lg transform hover:scale-110 transition-transform"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 aspect-video bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-4 group hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => openCamera('new')}>
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 shadow-sm group-hover:scale-110 transition-transform duration-500">
                        <Camera size={32} />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Capture fotos para o acervo</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-indigo-600 p-8 md:p-10 rounded-[40px] shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet size={24} /> Importação em Lote
                  </h3>
                  <button 
                    onClick={downloadTemplate}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/20 flex items-center gap-1.5"
                  >
                    <Download size={12} /> Planilha Modelo
                  </button>
                </div>
                
                <p className="text-indigo-100 text-sm mb-8 leading-relaxed opacity-90 relative z-10">
                  Economize tempo importando centenas de materiais pedagógicos de uma única vez via Excel ou CSV.
                </p>

                <label className="block w-full cursor-pointer relative z-10">
                  <div className="bg-white/10 border-2 border-dashed border-white/30 rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 hover:bg-white/20 hover:border-white/50 transition-all text-center group/btn active:scale-[0.98]">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-indigo-600 shadow-xl group-hover/btn:rotate-6 transition-transform">
                      <Upload size={32} />
                    </div>
                    <div>
                      <span className="font-bold text-white block text-lg">Selecionar Arquivo</span>
                      <span className="text-[10px] text-white/60 uppercase tracking-widest">Excel ou CSV</span>
                    </div>
                  </div>
                  <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-700">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Histórico de Movimentações</h2>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={16} />
                <span className="text-xs font-medium">Tempo real</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('timestamp')}>
                      <div className="flex items-center gap-2">Data / Hora <SortIcon columnKey="timestamp" /></div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600" onClick={() => requestSort('itemName')}>
                      <div className="flex items-center gap-2">Material <SortIcon columnKey="itemName" /></div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600" onClick={() => requestSort('teacherName')}>
                      <div className="flex items-center gap-2">Responsável <SortIcon columnKey="teacherName" /></div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 text-right" onClick={() => requestSort('type')}>
                      <div className="flex items-center justify-end gap-2">Operação <SortIcon columnKey="type" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-8 py-6 whitespace-nowrap text-xs text-slate-500 font-bold">
                        {new Date(t.timestamp).toLocaleDateString('pt-BR')} <span className="text-slate-300 font-medium ml-1">{new Date(t.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{t.itemName}</p>
                        {t.notes && <p className="text-[10px] text-slate-400 italic mt-0.5">{t.notes}</p>}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black">
                             {t.teacherName.substring(0,2).toUpperCase()}
                           </div>
                           <span className="text-slate-600 text-sm font-medium">{t.teacherName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${t.type === 'retirada' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {t.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sortedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-32 text-center text-slate-400 italic">
                        <HistoryIcon size={64} className="mx-auto mb-6 opacity-5" />
                        <p className="text-lg font-bold">Sem registros de atividade.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Maintenance Defect Modal with Photo Capture */}
      {isMaintenanceModalOpen && itemPendingMaintenance && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
             <header className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Hammer size={24} className="text-rose-600" /> Relatar Defeito
                   </h3>
                   <p className="text-sm text-slate-400 font-medium mt-1">Encaminhando: {itemPendingMaintenance.name}</p>
                </div>
                <button onClick={() => setIsMaintenanceModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                   <X size={20} className="text-slate-500" />
                </button>
             </header>

             <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Descrição do Problema</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-100 focus:border-rose-500 outline-none h-28 text-sm resize-none transition-all placeholder:text-slate-300"
                    placeholder="Descreva o que está quebrado..."
                    value={defectDescription}
                    onChange={(e) => setDefectDescription(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos do Defeito ({defectPhotos.length})</label>
                    <button 
                      onClick={() => openCamera('defect')} 
                      className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                    >
                      <Camera size={14} /> Tirar Foto
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {defectPhotos.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-rose-100 shadow-sm group">
                        <img src={img} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setDefectPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {defectPhotos.length === 0 && (
                      <div className="col-span-4 py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        <Camera size={24} className="opacity-10" />
                        Opcional
                      </div>
                    )}
                  </div>
                </div>
             </div>

             <footer className="p-8 pt-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="flex-1 px-8 py-4 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-2xl transition-all"
                >
                   Cancelar
                </button>
                <button 
                  onClick={confirmMaintenance}
                  className="flex-[2] px-8 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                >
                   <CheckCircle size={18} /> Confirmar Reparo
                </button>
             </footer>
          </div>
        </div>
      )}

      {/* Image Expansion Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[3000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
          onClick={() => setExpandedImage(null)}
        >
          <button className="absolute top-8 right-8 text-white/60 hover:text-white p-4 bg-white/5 rounded-full backdrop-blur-md transition-all z-10">
            <X size={32} />
          </button>
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={expandedImage} 
              className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500" 
              alt="Expanded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <header className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Editar Material</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {editingItem.id}</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={24} />
              </button>
            </header>
            
            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Material</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                      value={editingItem.name}
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={editingItem.category}
                        onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantidade</label>
                      <input 
                        type="number" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                        value={editingItem.quantity}
                        onChange={e => setEditingItem({...editingItem, quantity: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Localização</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={editingItem.location}
                      onChange={e => setEditingItem({...editingItem, location: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-36 resize-none"
                      value={editingItem.description}
                      onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Imagens ({editingItem.images.length})</label>
                      <button onClick={() => openCamera('edit')} className="text-[10px] font-black text-indigo-600 flex items-center gap-1.5 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                        <Camera size={12} /> Nova Foto
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {editingItem.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-slate-100">
                          <img src={img} className="w-full h-full object-cover" alt={`Preview ${idx}`} />
                          <button 
                            onClick={() => removeCapturedImage(idx)}
                            className="absolute top-1 right-1 p-2 bg-rose-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kit de Componentes</label>
                      <button onClick={addComponentRow} className="text-[10px] font-black text-indigo-600 flex items-center gap-1.5 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                        <Plus size={12} /> Nova Peça
                      </button>
                    </div>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-3 custom-scrollbar">
                      {editingItem.components.map(comp => (
                        <div key={comp.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <input 
                            type="text" 
                            className="flex-1 p-2 bg-white border border-slate-100 rounded-xl text-xs font-medium" 
                            placeholder="Peça"
                            value={comp.name}
                            onChange={e => updateComponent(comp.id, 'name', e.target.value)}
                          />
                          <input 
                            type="number" 
                            className="w-16 p-2 bg-white border border-slate-100 rounded-xl text-xs text-center font-bold" 
                            value={comp.quantity}
                            onChange={e => updateComponent(comp.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                          <button onClick={() => removeComponentRow(comp.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <footer className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
              <button onClick={() => setEditingItem(null)} className="px-8 py-3 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-2xl transition-colors">
                Cancelar
              </button>
              <button onClick={updateItem} className="px-10 py-3 bg-indigo-600 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Save size={18} /> Confirmar Edição
              </button>
            </footer>
          </div>
        </div>
      )}

      {showCameraModal && (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-between p-6">
          <div className="w-full flex justify-between items-center z-10">
            <div className="text-white">
              <h3 className="font-bold text-lg">Câmera Almoxarifado</h3>
              <p className="text-[10px] uppercase text-white/60 font-black tracking-widest">
                Capturadas: {
                  cameraMode === 'edit' && editingItem ? editingItem.images.length : 
                  cameraMode === 'defect' ? defectPhotos.length : 
                  capturedImages.length
                }
              </p>
            </div>
            <button onClick={closeCamera} className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-white/20 transition-all">
              <X size={28} />
            </button>
          </div>
          <div className="relative w-full max-w-2xl aspect-video rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl border border-white/10 flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          <div className="w-full max-w-2xl flex items-center justify-between px-6 pb-12 z-10">
            <div className="w-20 h-20 rounded-2xl border border-white/20 overflow-hidden bg-white/10 backdrop-blur-md">
              {(() => {
                const lastImg = 
                  cameraMode === 'edit' && editingItem ? editingItem.images[editingItem.images.length - 1] : 
                  cameraMode === 'defect' ? defectPhotos[defectPhotos.length - 1] : 
                  capturedImages[capturedImages.length - 1];
                return lastImg && <img src={lastImg} className="w-full h-full object-cover" alt="Last" />;
              })()}
            </div>
            <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full p-2 shadow-2xl active:scale-90 transition-transform">
              <div className="w-full h-full border-4 border-slate-900 rounded-full flex items-center justify-center">
                <div className="w-14 h-14 bg-indigo-600 rounded-full"></div>
              </div>
            </button>
            <button onClick={closeCamera} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-colors text-sm uppercase tracking-widest">Concluir</button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center md:p-6 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white rounded-t-[40px] md:rounded-[48px] shadow-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-500">
            <div className="relative h-72 md:h-[400px] overflow-hidden shrink-0 group/gallery">
              <img src={selectedItem.images[activeImageIndex]} alt={selectedItem.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
              
              {selectedItem.images.length > 1 && (
                <>
                  <button onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : selectedItem.images.length - 1)} className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-xl text-white p-3 rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity border border-white/20">
                    <ChevronLeft size={28} />
                  </button>
                  <button onClick={() => setActiveImageIndex(prev => prev < selectedItem.images.length - 1 ? prev + 1 : 0)} className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-xl text-white p-3 rounded-full opacity-0 group-hover/gallery:opacity-100 transition-opacity border border-white/20">
                    <ChevronRight size={28} />
                  </button>
                </>
              )}

              <button onClick={() => { setSelectedItem(null); setSuggestions(null); }} className="absolute top-6 right-6 bg-white/10 backdrop-blur-xl text-white p-3 rounded-full shadow-lg border border-white/20 active:scale-90 transition-all">
                <X size={24} />
              </button>
              
              <div className="absolute bottom-8 left-10 right-10">
                <span className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mb-2 block">{selectedItem.category}</span>
                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">{selectedItem.name}</h2>
              </div>
            </div>
            
            <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar">
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Disponível em Estoque</span>
                      <span className="text-4xl font-black text-indigo-700">{selectedItem.quantity} <span className="text-sm text-indigo-400 ml-1">unidades</span></span>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <Package size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Info size={14} /> Sobre o Recurso
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{selectedItem.description}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Layers size={14} /> Peças do Kit
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedItem.components.map(c => (
                        <div key={c.id} className="flex items-center justify-between text-sm p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                          <span className="text-slate-800 font-bold">{c.name}</span>
                          <span className="bg-indigo-600 px-3 py-1 rounded-full text-[10px] font-black text-white shadow-md">x{c.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="p-8 bg-indigo-600 rounded-[32px] shadow-xl shadow-indigo-100 relative overflow-hidden group/ai">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover/ai:scale-150 transition-transform duration-1000"></div>
                    <h3 className="font-black text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-widest relative z-10">
                      <Sparkles size={18} /> Sugestões Pedagógicas (IA)
                    </h3>
                    {!suggestions ? (
                      <button onClick={() => loadSuggestions(selectedItem)} disabled={loadingSuggestions} className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 disabled:bg-indigo-400 disabled:text-indigo-200 shadow-lg relative z-10 transition-all active:scale-95">
                        {loadingSuggestions ? 'Analisando recurso...' : 'Gerar Ideias de Aula'}
                      </button>
                    ) : (
                      <div className="text-xs text-indigo-50 leading-relaxed bg-white/10 p-5 rounded-2xl border border-white/20 max-h-56 overflow-y-auto custom-scrollbar relative z-10">
                        {suggestions.split('\n').map((line, i) => (
                          <p key={i} className="mb-2 last:mb-0">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    {selectedItem.status === 'disponivel' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Professor Responsável</label>
                          <input 
                            type="text" 
                            placeholder="Nome completo..." 
                            className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-indigo-100 outline-none text-sm transition-all" 
                            value={teacherName} 
                            onChange={(e) => setTeacherName(e.target.value)} 
                          />
                        </div>
                        <button onClick={() => handleTransaction(selectedItem, 'retirada')} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3">
                          <LogIn size={20} /> Registrar Retirada
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="bg-amber-50 p-6 rounded-[24px] border border-amber-100 flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white font-black text-lg">
                            {selectedItem.currentBorrower?.substring(0,1).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Atualmente com</span>
                            <p className="font-black text-slate-800 text-lg leading-none">{selectedItem.currentBorrower}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button onClick={() => handleTransaction(selectedItem, 'devolucao')} className="flex-1 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                             <HistoryIcon size={20} /> Devolver
                           </button>
                           <button 
                            onClick={() => openMaintenanceModal(selectedItem)} 
                            className="w-14 h-14 bg-rose-600 text-white rounded-[20px] shadow-xl shadow-rose-100 active:scale-95 transition-all flex items-center justify-center group relative border border-white/20"
                           >
                             <Hammer size={22} />
                             <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 font-black uppercase tracking-widest border border-white/10 shadow-2xl">
                               Reparo
                             </span>
                           </button>
                        </div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom {
          from { transform: translateY(1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-in {
          animation-fill-mode: forwards;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom; }
        .zoom-in-95 { animation-name: zoom-in; }
      `}</style>
    </div>
  );
};

export default App;
