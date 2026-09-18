/** Um cliente HTTP (n8n incluído) pode mandar parâmetro vazio ("") em vez de
 * simplesmente omitir — trata como "não veio" antes de validar. Mesmo truque
 * usado no filtro de /lancamentos (a tela). */
export function semCamposVazios(valor: unknown) {
  if (typeof valor !== "object" || valor === null) return valor;
  return Object.fromEntries(Object.entries(valor as Record<string, unknown>).filter(([, v]) => v !== ""));
}
