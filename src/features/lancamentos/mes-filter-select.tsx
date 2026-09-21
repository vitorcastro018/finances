"use client";

/** O <select> de mês do filtro de /lancamentos — com opções fixas
 * (diferente das do FiltroSelect genérico), mas com o mesmo comportamento:
 * filtra sozinho ao trocar, sem precisar clicar em "Filtrar".
 * `form.requestSubmit()` reenvia o mesmo GET nativo com todos os campos
 * preenchidos, então os outros filtros já escolhidos continuam valendo. */
export function MesFilterSelect({
  valor,
  opcoes,
}: {
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <select
      name="mes"
      defaultValue={valor}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
    >
      <option value="todos">Todo o período</option>
      {opcoes.map((opcao) => (
        <option key={opcao.valor} value={opcao.valor}>
          {opcao.rotulo}
        </option>
      ))}
    </select>
  );
}
