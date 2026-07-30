import { CATEGORIES } from '../constants/categories';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Moradia: ['aluguel', 'condominio', 'condom\u00ednio', 'financiamento', 'imovel', 'im\u00f3vel', 'casa'],
  Alimentação: ['ifood', 'restaurante', 'mercado', 'padaria', 'lanchonete', 'burger', 'pizza', 'supermercado'],
  Transporte: ['uber', '99', 'posto', 'combustivel', 'combust\u00edvel', 'gasolina', 'estacionamento', 'metro', 'metr\u00f4'],
  Saúde: ['farmacia', 'farm\u00e1cia', 'drogaria', 'hospital', 'clinica', 'cl\u00ednica', 'medico', 'm\u00e9dico'],
  Telefonia: ['claro', 'vivo', 'tim', 'oi', 'telefone', 'internet', 'fibra'],
  'Cartão de Crédito': ['cartao', 'cart\u00e3o', 'fatura', 'credito', 'cr\u00e9dito', 'nubank', 'itaucard'],
  Dívidas: ['emprestimo', 'empr\u00e9stimo', 'parcela', 'limite', 'financiamento'],
  Investimentos: ['investimento', 'tesouro', 'cdb', 'renda fixa', 'acoes', 'a\u00e7\u00f5es'],
};

function normalize(text: string): string {
  return text.toLowerCase();
}

export function detectCategory(text: string): string {
  const normalizedText = normalize(text || '');

  for (const category of CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category] || [];

    if (keywords.some((keyword) => normalizedText.includes(keyword))) {
      return category;
    }
  }

  return 'Outros';
}
