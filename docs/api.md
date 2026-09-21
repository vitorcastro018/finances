# API pra agente (n8n)

Rotas em `src/app/api/**`, pensadas pra um agente (n8n, ou qualquer outro
cliente HTTP) criar lançamentos, consultar indicadores e marcar contas como
pagas — sem passar pelo login do navegador.

## Configuração (uma vez só)

Três variáveis de ambiente novas, além das que o app já usa. Sem elas
configuradas, toda rota de `/api/**` responde `500` explicando o que falta —
o resto do app continua funcionando normal.

| Variável | Onde pegar |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Painel do Supabase → **Settings → API** → `service_role` (secreta — nunca é a mesma que `SUPABASE_PUBLISHABLE_KEY`). |
| `APP_USER_ID` | Painel do Supabase → **Authentication → Users** → copie o `UID` do seu usuário (o único que existe). |
| `API_KEY` | Qualquer string aleatória e longa seu — é a "senha" que o n8n vai mandar em todo request. Gere uma, por exemplo, com `openssl rand -hex 32`. |

Configure as três na Vercel (Settings → Environment Variables) do mesmo jeito
que já fez com `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`.

## Autenticação

Todo request leva o header:

```
Authorization: Bearer <API_KEY>
```

Sem isso (ou com a chave errada), a resposta é `401`.

## Endpoints

### `POST /api/lancamentos` — criar um lançamento

```bash
curl -X POST https://SEU-APP.vercel.app/api/lancamentos \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Supermercado",
    "tipo": "saida",
    "categoria": "Mercado",
    "valor_previsto": 187.40,
    "data_prevista": "2026-09-15",
    "metodo": "Pix",
    "pago": false,
    "cartao": "Nubank"
  }'
```

- `nome`, `tipo` (`"entrada"` ou `"saida"`), `categoria` (**nome**, não id — precisa já existir) e `valor_previsto` são obrigatórios.
- `data_prevista` (`yyyy-mm-dd`) é opcional — sem ela, usa hoje. Sem `cartao`, é a data de vencimento (ou compra à vista). **Com `cartao`, é a data DA COMPRA** — a rota calcula sozinha em qual fatura ela cai (fechamento/vencimento do cartão) e grava isso como `data_prevista`, igual ao formulário.
- `metodo` é opcional.
- `pago` é opcional (padrão `false`) — `true` já lança como pago, usando o próprio valor/data previstos (já resolvidos pra fatura, se houver cartão) como reais (igual o checkbox "Já paguei" do formulário).
- `cartao` é opcional — **nome** de um cartão ativo já cadastrado (ver `GET /api/cartoes` abaixo). Sem ele, o lançamento não fica ligado a nenhum cartão.
- Se `categoria` não bater com nenhuma categoria de topo cadastrada (comparação sem diferenciar maiúscula/minúscula), a resposta `400` lista as categorias disponíveis daquele tipo. Mesma coisa pra `cartao` que não bater com nenhum cartão ativo.

Resposta `201`: o lançamento criado, no mesmo formato do `GET` abaixo.

### `GET /api/lancamentos` — listar/buscar

```bash
curl "https://SEU-APP.vercel.app/api/lancamentos?mes=2026-09&tipo=saida&pago=false" \
  -H "Authorization: Bearer $API_KEY"
```

Query params, todos opcionais:

| Param | Valores |
|---|---|
| `mes` | `yyyy-mm` (padrão: mês atual) ou `todos` |
| `tipo` | `entrada` \| `saida` |
| `categoria` | nome da categoria — exige `tipo` junto |
| `cartao` | nome do cartão (ativo) |
| `pago` | `true` \| `false` |
| `busca` | texto livre, procura no nome |

Resposta `200`: lista ordenada por data (mais recente primeiro), cada item:

```json
{
  "id": "...",
  "nome": "Supermercado",
  "tipo": "saida",
  "categoria": "Mercado",
  "valor_previsto": 187.4,
  "valor_pago": null,
  "data_prevista": "2026-09-15",
  "data_pagamento": null,
  "pago": false,
  "situacao": "a_vencer",
  "metodo": "Pix",
  "cartao": null,
  "data_compra": null
}
```

`cartao` é o nome do cartão ligado ao lançamento, ou `null` se não teve cartão.
`data_compra` só vem preenchida quando teve cartão — nesse caso `data_prevista`
já é o vencimento da fatura, não o dia da compra.

### `PATCH /api/lancamentos/:id/pago` — marcar como pago/recebido (ou desfazer)

```bash
curl -X PATCH https://SEU-APP.vercel.app/api/lancamentos/UUID-DO-LANCAMENTO/pago \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pago": true, "valor_pago": 190.00, "data_pagamento": "2026-09-16"}'
```

- `pago: true` sem `valor_pago`/`data_pagamento` usa o valor/data previstos do próprio lançamento.
- `{"pago": false}` desmarca (limpa valor/data pagos).

Resposta `200`: o lançamento atualizado. `404` se o id não existir.

### `GET /api/indicadores` — os números do dashboard

```bash
curl "https://SEU-APP.vercel.app/api/indicadores?mes=2026-09" \
  -H "Authorization: Bearer $API_KEY"
```

`mes` (`yyyy-mm`) é opcional, padrão o mês atual — sem opção "todos" aqui (indicador é sempre de um mês).

Resposta `200`:

```json
{
  "mes": "2026-09",
  "previsto_a_pagar": 4370.00,
  "ja_pago": 2100.00,
  "faltam_pagar": 5,
  "previsto_a_receber": 6200.00,
  "ja_recebido": 6200.00,
  "saldo_previsto": 1830.00,
  "saldo_do_mes": 4100.00,
  "gasto_por_categoria": [{ "categoria": "Despesas Fixas", "total": 3800 }],
  "receita_por_categoria": [{ "categoria": "Salário", "total": 6200 }]
}
```

### `GET /api/categorias` — listar (com subcategorias já aninhadas)

```bash
curl "https://SEU-APP.vercel.app/api/categorias?tipo=saida" \
  -H "Authorization: Bearer $API_KEY"
```

`tipo` (`entrada` \| `saida`) é opcional — sem ele, lista os dois.

Resposta `200`: categorias de topo, cada uma já com suas subcategorias:

```json
[
  {
    "id": "...",
    "nome": "Despesas Fixas",
    "tipo": "saida",
    "cor": "#64748b",
    "subcategorias": [{ "id": "...", "nome": "Aluguel", "cor": "#64748b" }]
  }
]
```

### `POST /api/categorias` — criar categoria ou subcategoria

Categoria de topo — `tipo` obrigatório:

```bash
curl -X POST https://SEU-APP.vercel.app/api/categorias \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Lazer", "tipo": "saida"}'
```

Subcategoria — `categoria_pai` é o **nome** de uma categoria de topo já existente; `tipo` e `cor` são sempre herdados dela (mesma regra da tela: não dá pra escolher tipo/cor de uma subcategoria à parte):

```bash
curl -X POST https://SEU-APP.vercel.app/api/categorias \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Cinema", "categoria_pai": "Lazer"}'
```

- `cor` (`#rrggbb`) é opcional e só vale pra categoria de topo — numa subcategoria é ignorado (vem do pai).
- Nome duplicado (mesmo entre categoria e subcategoria — o nome é único por conta, não por tipo) → `409`.
- `categoria_pai` que não existir → `400`, listando as categorias de topo disponíveis.

Resposta `201`:

```json
{ "id": "...", "nome": "Cinema", "tipo": "saida", "cor": "#64748b", "categoria_pai": "Lazer" }
```

### `GET /api/cartoes` — listar cartões ativos

```bash
curl "https://SEU-APP.vercel.app/api/cartoes" \
  -H "Authorization: Bearer $API_KEY"
```

Sem query params — sempre lista todos os cartões ativos (mesmo filtro do
`<select>` no formulário). Use os `nome` daqui no campo `cartao` de
`POST`/`GET /api/lancamentos`.

Resposta `200`:

```json
[
  { "id": "...", "nome": "Nubank", "dia_fechamento": 25, "dia_vencimento": 5 }
]
```

## O que não tem (por enquanto)

Anexo de comprovante, parcelamento e contas fixas não têm endpoint — só o
que foi pedido pro agente (criar/listar lançamentos, cartões e categorias,
consultar indicadores, marcar como pago). Cadastrar/editar/desativar cartão
também não — só listar os já cadastrados pela tela. Dá pra adicionar do
mesmo jeito depois.
