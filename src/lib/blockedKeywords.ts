// Lista completa de palavras bloqueadas por categoria
export const BLOCKED_KEYWORDS = [
  // Comida
  'lanche', 'lanches', 'comida', 'alimento', 'alimentação', 'alimentacao', 'refeição', 'refeicao',
  // Bebidas/Tabaco
  'bebida', 'bebidas', 'cerveja', 'álcool', 'alcool', 'cigarro', 'tabaco',
  // Armas/Drogas
  'arma', 'armas', 'munição', 'municao', 'drogas', 'medicamento', 'remédio', 'remedio',
  // Apostas
  'jogo', 'jogos', 'aposta', 'apostas', 'cassino', 'casino', 'bet', 'betting',
  // Adulto
  'sexo', 'adulto', 'pornô', 'porno', 'xxx', 'erótico', 'erotico',
  // Pirataria
  'hack', 'hacker', 'pirata', 'pirataria', 'cracked', 'crack',
  // Donate/Fraude
  'doacao', 'doação', 'donate', 'donation', 'tragedia', 'tragédia', 'golpe', 'falso', 'mentira', 'fraude',
];

export function containsBlockedKeyword(text: string): { blocked: boolean; keyword?: string } {
  if (!text) return { blocked: false };
  
  const lowerText = text.toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(lowerText)) {
      return { blocked: true, keyword };
    }
  }
  return { blocked: false };
}

export function validateProductName(name: string): { valid: boolean; error?: string } {
  const result = containsBlockedKeyword(name);
  if (result.blocked) {
    return { 
      valid: false, 
      error: `O nome contém uma palavra proibida: "${result.keyword}". Por favor, escolha outro nome.`
    };
  }
  return { valid: true };
}
