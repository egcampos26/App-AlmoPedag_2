
export type ItemStatus = 'disponivel' | 'emprestado' | 'manutencao';

export interface PedagogicalComponent {
  id: string;
  name: string;
  quantity: number;
}

export interface PedagogicalItem {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  status: ItemStatus;
  components: PedagogicalComponent[];
  location: string;
  quantity: number; // Total quantity of the item itself
  currentBorrower?: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  teacherName: string;
  type: 'retirada' | 'devolucao';
  timestamp: number;
  notes?: string;
}

export interface DashboardStats {
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  recentTransactions: Transaction[];
}
