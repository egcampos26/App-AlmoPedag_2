
import { PedagogicalItem } from './types';

export const INITIAL_ITEMS: PedagogicalItem[] = [
  {
    id: '1',
    name: 'Kit Robótica Iniciante v2',
    category: 'Tecnologia',
    description: 'Conjunto completo para introdução à lógica de programação e montagem de circuitos básicos.',
    images: ['https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?auto=format&fit=crop&q=80&w=400'],
    status: 'disponivel',
    location: 'Armário A - Prateleira 2',
    quantity: 5,
    components: [
      { id: 'c1', name: 'Placa Microcontroladora', quantity: 1 },
      { id: 'c2', name: 'Sensores de Distância', quantity: 2 },
      { id: 'c3', name: 'Cabos Jumper', quantity: 20 },
      { id: 'c4', name: 'Chassi de Acrílico', quantity: 1 }
    ]
  },
  {
    id: '2',
    name: 'Microscópio Binocular Óptico',
    category: 'Ciências',
    description: 'Equipamento de alta precisão para observação de lâminas biológicas com aumento de até 1000x.',
    images: ['https://images.unsplash.com/photo-1516339901600-2e1a6298ed70?auto=format&fit=crop&q=80&w=400'],
    status: 'emprestado',
    currentBorrower: 'Prof. Ricardo Silva',
    location: 'Laboratório 1',
    quantity: 2,
    components: [
      { id: 'c5', name: 'Lentes Oculares 10x', quantity: 2 },
      { id: 'c6', name: 'Objetivas (4x, 10x, 40x, 100x)', quantity: 4 },
      { id: 'c7', name: 'Capa Protetora', quantity: 1 }
    ]
  },
  {
    id: '3',
    name: 'Maleta de Jogos Matemáticos',
    category: 'Matemática',
    description: 'Diversos jogos para ensino lúdico de frações, geometria e aritmética.',
    images: ['https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&q=80&w=400'],
    status: 'disponivel',
    location: 'Sala de Recursos - Gaveta 4',
    quantity: 10,
    components: [
      { id: 'c8', name: 'Blocos Lógicos', quantity: 48 },
      { id: 'c9', name: 'Tangram de Madeira', quantity: 5 },
      { id: 'c10', name: 'Dominó de Frações', quantity: 2 }
    ]
  },
  {
    id: '4',
    name: 'Projetor Multimídia Portátil',
    category: 'Audiovisual',
    description: 'Projetor compacto com entrada HDMI e conexão Wi-Fi para apresentações em sala.',
    images: ['https://images.unsplash.com/photo-1535016120720-40c646bebbbb?auto=format&fit=crop&q=80&w=400'],
    status: 'manutencao',
    location: 'Suporte Técnico',
    quantity: 1,
    components: [
      { id: 'c11', name: 'Cabo HDMI 3m', quantity: 1 },
      { id: 'c12', name: 'Controle Remoto', quantity: 1 },
      { id: 'c13', name: 'Fonte de Alimentação', quantity: 1 }
    ]
  }
];
