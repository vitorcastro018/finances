/** Um cliente HTTP (n8n incluído) pode mandar parâmetro vazio ("") em vez de
 * simplesmente omitir — trata como "não veio" antes de validar. Mesmo truque
 * usado no filtro de /lancamentos (a tela). */
export function semCamposVazios(valor: unknown) {
  if (typeof valor !== "object" || valor === null) return valor;
  return Object.fromEntries(Object.entries(valor as Record<string, unknown>).filter(([, v]) => v !== ""));
}

/** Um body JSON pode mandar `null` num campo opcional em vez de simplesmente
 * omitir (comum em automações tipo n8n, que preenchem todo campo do
 * formulário mesmo os vazios) — trata como "não veio" antes de validar.
 * Campo obrigatório enviado como `null` também cai aqui, e vira o mesmo erro
 * de "campo obrigatório" de quando ele é omitido, em vez de um erro de tipo
 * confuso ("esperava string, recebeu null"). */
export function semCamposNulos(valor: unknown) {
  if (typeof valor !== "object" || valor === null) return valor;
  return Object.fromEntries(Object.entries(valor as Record<string, unknown>).filter(([, v]) => v !== null));
}
