export const CATEGORIES = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Telefonia',
  'Cartão de Crédito',
  'Dívidas',
  'Investimentos',
  'Outros',
] as const;

export type Category = (typeof CATEGORIES)[number];
