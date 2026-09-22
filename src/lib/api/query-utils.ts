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
 * Também cobre a string literal "null": ferramentas de IA (ex.: um agente
 * n8n montando a chamada) às vezes mandam o texto "null" em vez do `null`
 * de verdade do JSON pra um campo que não têm valor — sem isso, um campo
 * como `cartao` aceitava "null" como se fosse o nome de um cartão de
 * verdade e tentava (e falhava) resolvê-lo. Campo obrigatório enviado como
 * `null`/"null" também cai aqui, e vira o mesmo erro de "campo obrigatório"
 * de quando ele é omitido, em vez de um erro de tipo confuso. */
export function semCamposNulos(valor: unknown) {
  if (typeof valor !== "object" || valor === null) return valor;
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).filter(
      ([, v]) => v !== null && !(typeof v === "string" && v.trim().toLowerCase() === "null"),
    ),
  );
}
