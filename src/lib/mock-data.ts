export type Order = {
  code: string;
  client: string;
  product: string;
  due: string;
  status: string;
  total: string;
  payment: string;
};

export type Client = {
  name: string;
  contact: string;
  phone: string;
  orders: number;
  value: string;
  status: string;
};

export type Product = {
  name: string;
  category: string;
  fabric: string;
  price: string;
  time: string;
};

export type ProductionOrder = {
  code: string;
  client: string;
  item: string;
  qty: number;
  due: string;
};

export type ProductionColumn = {
  title: string;
  color: string;
  orders: ProductionOrder[];
};

export const stats = [
  {
    label: "Pedidos em aberto",
    value: "38",
    note: "12 vencem nesta semana",
    accent: "bg-[#087f7d]",
  },
  {
    label: "Atrasados",
    value: "5",
    note: "prioridade alta",
    accent: "bg-[#c43f54]",
  },
  {
    label: "Faturamento previsto",
    value: "R$ 42,8 mil",
    note: "+18% vs. mês anterior",
    accent: "bg-[#c88a2b]",
  },
  {
    label: "Estoque baixo",
    value: "9",
    note: "materiais precisam reposicao",
    accent: "bg-[#5b68d8]",
  },
];

export const production: ProductionColumn[] = [
  {
    title: "Recebido",
    color: "border-t-[#5b68d8]",
    orders: [
      { code: "#1028", client: "Bella Uniformes", item: "Camisetas polo", qty: 120, due: "12 jun" },
      { code: "#1032", client: "Atelie Nora", item: "Bones bordados", qty: 80, due: "Hoje" },
    ],
  },
  {
    title: "Corte",
    color: "border-t-[#087f7d]",
    orders: [
      { code: "#1017", client: "Studio Fit", item: "Leggings", qty: 240, due: "14 jun" },
      { code: "#1022", client: "Marca Areia", item: "Camisas linho", qty: 60, due: "15 jun" },
    ],
  },
  {
    title: "Costura",
    color: "border-t-[#c88a2b]",
    orders: [
      { code: "#1009", client: "Escola Prisma", item: "Uniformes", qty: 310, due: "Atrasado" },
      { code: "#1014", client: "Loja Savana", item: "Vestidos", qty: 45, due: "16 jun" },
    ],
  },
  {
    title: "Acabamento",
    color: "border-t-[#c43f54]",
    orders: [
      { code: "#0998", client: "Clinica Vitta", item: "Jalecos", qty: 95, due: "Atrasado" },
    ],
  },
  {
    title: "Pronto",
    color: "border-t-[#111a16]",
    orders: [
      { code: "#0995", client: "Clube Norte", item: "Agasalhos", qty: 70, due: "Retirada" },
    ],
  },
];

export const orders: Order[] = [
  {
    code: "#1032",
    client: "Atelie Nora",
    product: "Bones bordados",
    due: "Hoje",
    status: "Aguardando material",
    total: "R$ 4.960",
    payment: "Parcial",
  },
  {
    code: "#1028",
    client: "Bella Uniformes",
    product: "Camisetas polo",
    due: "12 jun",
    status: "Pedido recebido",
    total: "R$ 7.800",
    payment: "Pendente",
  },
  {
    code: "#1017",
    client: "Studio Fit",
    product: "Leggings",
    due: "14 jun",
    status: "Corte",
    total: "R$ 13.440",
    payment: "Pago",
  },
  {
    code: "#1009",
    client: "Escola Prisma",
    product: "Uniformes",
    due: "Atrasado",
    status: "Costura",
    total: "R$ 18.600",
    payment: "Parcial",
  },
];

export const clients: Client[] = [
  {
    name: "Bella Uniformes",
    contact: "Marina Costa",
    phone: "(11) 98820-4100",
    orders: 18,
    value: "R$ 48.200",
    status: "Ativo",
  },
  {
    name: "Escola Prisma",
    contact: "Roberto Lima",
    phone: "(11) 97210-8801",
    orders: 11,
    value: "R$ 36.900",
    status: "Ativo",
  },
  {
    name: "Atelie Nora",
    contact: "Nora Alves",
    phone: "(11) 98123-7711",
    orders: 7,
    value: "R$ 19.740",
    status: "Novo",
  },
  {
    name: "Studio Fit",
    contact: "Camila Rocha",
    phone: "(11) 99602-3320",
    orders: 14,
    value: "R$ 42.510",
    status: "Ativo",
  },
];

export const products: Product[] = [
  {
    name: "Camiseta polo",
    category: "Uniformes",
    fabric: "Malha PV",
    price: "R$ 65",
    time: "5 dias",
  },
  {
    name: "Bone bordado",
    category: "Acessorios",
    fabric: "Brim",
    price: "R$ 62",
    time: "4 dias",
  },
  {
    name: "Jaleco",
    category: "Profissional",
    fabric: "Oxford",
    price: "R$ 98",
    time: "7 dias",
  },
  {
    name: "Legging",
    category: "Fitness",
    fabric: "Suplex",
    price: "R$ 56",
    time: "6 dias",
  },
];

export const materials = [
  { name: "Malha PV branca", unit: "metros", current: 32, min: 60 },
  { name: "Linha preta", unit: "cones", current: 11, min: 20 },
  { name: "Etiqueta P", unit: "unidades", current: 180, min: 300 },
];

export const stockItems = [
  { name: "Malha PV branca", category: "Tecido", unit: "metros", current: 32, min: 60, supplier: "TexNorte" },
  { name: "Brim azul marinho", category: "Tecido", unit: "metros", current: 88, min: 50, supplier: "Casa do Brim" },
  { name: "Linha preta", category: "Aviamento", unit: "cones", current: 11, min: 20, supplier: "Costura Mix" },
  { name: "Etiqueta P", category: "Etiqueta", unit: "unidades", current: 180, min: 300, supplier: "Label Pro" },
];

export const payments = [
  { order: "#1032", client: "Atelie Nora", due: "Hoje", status: "Parcial", amount: "R$ 4.960", paid: "R$ 2.000" },
  { order: "#1028", client: "Bella Uniformes", due: "12 jun", status: "Pendente", amount: "R$ 7.800", paid: "R$ 0" },
  { order: "#1017", client: "Studio Fit", due: "14 jun", status: "Pago", amount: "R$ 13.440", paid: "R$ 13.440" },
  { order: "#1009", client: "Escola Prisma", due: "Atrasado", status: "Parcial", amount: "R$ 18.600", paid: "R$ 8.600" },
];

export const reportCards = [
  { title: "Pedidos por etapa", value: "38", note: "maior volume em costura" },
  { title: "Faturamento realizado", value: "R$ 24,1 mil", note: "56% do previsto" },
  { title: "Materiais criticos", value: "3", note: "abaixo do estoque mínimo" },
  { title: "Clientes recorrentes", value: "18", note: "compraram nos ultimos 60 dias" },
];
