/**
 * Normaliza telefone BR pra formato com DDI (ex: "(92) 99143-3005" -> "5592991433005").
 * Retorna null se não parecer um telefone válido (DDD + 8 ou 9 dígitos, com ou sem "55").
 */
export function normalizeBrazilPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits;
  }
  return null;
}
