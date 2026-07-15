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

/**
 * Formata progressivamente o telefone digitado no padrão BR:
 * "(92) 9914-3300" (fixo, 8 dígitos locais) ou "(92) 99143-3005" (celular, 9 dígitos).
 * Usado para mascarar o campo enquanto o usuário digita.
 */
export function formatBrazilPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `(${ddd}`;

  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;

  const splitAt = rest.length > 8 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`;
}
