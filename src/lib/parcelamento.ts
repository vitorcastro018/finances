/**
 * Calcula o valor de cada parcela de uma compra parcelada.
 *
 * Sem juros: divisão simples do valor total, com a última parcela absorvendo
 * o resto do arredondamento (a soma bate exatamente com o valor total).
 *
 * Com juros: fórmula de prestação fixa (tabela Price) — a mesma usada em
 * financiamento parcelado com juros compostos ao mês. Aqui a soma das
 * parcelas é maior que o valor total (é o que o juros significa), então não
 * faz sentido "corrigir" a última parcela para bater com o total.
 */
export function calcularParcelas({
  valorTotal,
  parcelas,
  jurosMensal = 0,
}: {
  valorTotal: number;
  parcelas: number;
  jurosMensal?: number;
}): number[] {
  if (parcelas < 1 || valorTotal <= 0) return [];

  if (!jurosMensal) {
    const base = Math.floor((valorTotal / parcelas) * 100) / 100;
    const valores = Array(parcelas).fill(base) as number[];
    const somaSemUltima = base * (parcelas - 1);
    valores[parcelas - 1] = Math.round((valorTotal - somaSemUltima) * 100) / 100;
    return valores;
  }

  const i = jurosMensal / 100;
  const prestacao = (valorTotal * i) / (1 - Math.pow(1 + i, -parcelas));
  const valorArredondado = Math.round(prestacao * 100) / 100;
  return Array(parcelas).fill(valorArredondado) as number[];
}
