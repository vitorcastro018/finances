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

## Resumo dos endpoints

| Método | Rota | Pra que serve |
|---|---|---|
| `POST` | `/api/lancamentos` | criar um lançamento |
| `GET` | `/api/lancamentos` | listar/buscar lançamentos |
| `PATCH` | `/api/lancamentos/:id/pago` | marcar/desmarcar como pago |
| `DELETE` | `/api/lancamentos/:id` | excluir um lançamento |
| `GET` | `/api/indicadores` | números do dashboard de um mês |
| `GET` | `/api/categorias` | listar categorias (com subcategorias) |
| `POST` | `/api/categorias` | criar categoria de topo ou subcategoria |
| `GET` | `/api/cartoes` | listar cartões ativos |

Detalhes de cada um, com os parâmetros obrigatórios e opcionais, abaixo.

Em todo body de `POST`/`PATCH`, um campo **opcional** marcado "Não" na tabela
pode vir omitido, como `null`, ou como a string `"null"` — os três são
tratados do mesmo jeito, como "não veio" (útil pra automações, n8n
incluído, que às vezes mandam o texto `"null"` em vez do `null` de verdade
pra um campo que não têm valor). Um campo **obrigatório** mandado como
`null`/`"null"` conta como se estivesse faltando, e dá o mesmo erro de
"obrigatório" de quando ele é omitido.

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
    "subcategoria": "Hortifruti",
    "valor_previsto": 187.40,
    "data_prevista": "2026-09-15",
    "metodo": "Pix",
    "pago": false,
    "cartao": "Nubank"
  }'
```

Body (JSON):

| Campo | Obrigatório? | Tipo / valores | Padrão / comportamento |
|---|---|---|---|
| `nome` | **Sim** | string (1–120 chars) | — |
| `tipo` | **Sim** | `"entrada"` \| `"saida"` | — |
| `categoria` | **Sim** | string — **nome** de uma categoria de topo, não id; precisa já existir (ver `GET /api/categorias`) | comparação sem diferenciar maiúscula/minúscula |
| `subcategoria` | Não | string — **nome** de uma subcategoria de `categoria`, não id | sem ela, o lançamento fica direto na categoria de topo (igual não escolher nada no `<select>` de subcategoria do formulário) |
| `valor_previsto` | **Sim** | número ≥ 0 | — |
| `data_prevista` | Não | `yyyy-mm-dd` | sem ela, usa hoje. Sem `cartao`: é a data de vencimento (ou compra à vista). **Com `cartao`: é a data DA COMPRA** — a rota calcula sozinha em qual fatura ela cai (fechamento/vencimento do cartão) e grava isso como `data_prevista`, igual ao formulário |
| `metodo` | Não | string (até 60 chars) | sem valor, fica `null` |
| `pago` | Não | booleano — aceita `true`/`false` de verdade ou a string `"true"`/`"false"` | padrão `false`. `true` já lança como pago, usando o próprio valor/data previstos (já resolvidos pra fatura, se houver cartão) como reais — igual o checkbox "Já paguei" do formulário |
| `cartao` | Não | string — **nome** de um cartão ativo já cadastrado (ver `GET /api/cartoes`) | sem ele, o lançamento não fica ligado a nenhum cartão |

Se `categoria` não bater com nenhuma categoria de topo cadastrada, a resposta
`400` lista as categorias disponíveis daquele tipo. Se `subcategoria` não
bater com nenhuma subcategoria de `categoria`, a resposta `400` lista as
subcategorias disponíveis dela. Mesma coisa pra `cartao` que não bater com
nenhum cartão ativo.

Resposta `201`: o lançamento criado, no mesmo formato do `GET` abaixo.

### `GET /api/lancamentos` — listar/buscar

```bash
curl "https://SEU-APP.vercel.app/api/lancamentos?mes=2026-09&tipo=saida&pago=false" \
  -H "Authorization: Bearer $API_KEY"
```

Query params, todos opcionais:

| Param | Obrigatório? | Valores |
|---|---|---|
| `mes` | Não | `yyyy-mm` (padrão: mês atual) ou `todos` |
| `tipo` | Não | `entrada` \| `saida` |
| `categoria` | Não — mas se vier, exige `tipo` junto (senão `400`) | nome da categoria de topo — filtra só quem está direto nela, não pega lançamentos numa subcategoria dela (sem filtro por subcategoria por enquanto) |
| `cartao` | Não | nome do cartão (ativo) |
| `pago` | Não | `true` \| `false` |
| `busca` | Não | texto livre, procura no nome |

Resposta `200`: lista ordenada por data (mais recente primeiro), cada item:

```json
{
  "id": "...",
  "nome": "Supermercado",
  "tipo": "saida",
  "categoria": "Mercado",
  "subcategoria": "Hortifruti",
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

`categoria` é sempre a categoria de topo; `subcategoria` é `null` quando o
lançamento está direto na categoria de topo, sem subcategoria escolhida.
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

`:id` na URL é **obrigatório** — uuid do lançamento.

Body (JSON):

| Campo | Obrigatório? | Tipo / valores | Padrão / comportamento |
|---|---|---|---|
| `pago` | **Sim** | booleano — aceita `true`/`false` de verdade ou a string `"true"`/`"false"` | `true` marca como pago; `false` desmarca (limpa `valor_pago`/`data_pagamento`) |
| `valor_pago` | Não — só faz sentido com `pago: true` | número ≥ 0 | omitido, usa o `valor_previsto` do próprio lançamento |
| `data_pagamento` | Não — só faz sentido com `pago: true` | `yyyy-mm-dd` | omitido, usa a `data_prevista` do próprio lançamento |

Com `{"pago": false}`, `valor_pago`/`data_pagamento` são ignorados mesmo se
enviados.

Resposta `200`: o lançamento atualizado. `404` se o id não existir.

### `DELETE /api/lancamentos/:id` — excluir um lançamento

```bash
curl -X DELETE https://SEU-APP.vercel.app/api/lancamentos/UUID-DO-LANCAMENTO \
  -H "Authorization: Bearer $API_KEY"
```

`:id` na URL é **obrigatório** — uuid do lançamento. Exclusão definitiva, sem
confirmação — não dá pra desfazer.

Resposta `204` sem corpo. `404` se o id não existir.

### `GET /api/indicadores` — os números do dashboard

```bash
curl "https://SEU-APP.vercel.app/api/indicadores?mes=2026-09" \
  -H "Authorization: Bearer $API_KEY"
```

| Param | Obrigatório? | Valores |
|---|---|---|
| `mes` | Não | `yyyy-mm`, padrão o mês atual — sem opção `"todos"` aqui (indicador é sempre de um mês) |

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

| Param | Obrigatório? | Valores |
|---|---|---|
| `tipo` | Não | `entrada` \| `saida` — sem ele, lista os dois |

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

Body (JSON):

| Campo | Obrigatório? | Tipo / valores | Padrão / comportamento |
|---|---|---|---|
| `nome` | **Sim** | string (1–60 chars) | — |
| `tipo` | **Sim** pra categoria de topo (sem `categoria_pai`). Ignorado se vier junto com `categoria_pai` | `"entrada"` \| `"saida"` | numa subcategoria, é sempre herdado do pai — não dá pra escolher à parte |
| `categoria_pai` | Não — presença é o que decide: com ele cria subcategoria, sem ele cria categoria de topo | string — **nome** de uma categoria de topo já existente | se não bater com nenhuma, `400` listando as disponíveis |
| `cor` | Não, e só vale pra categoria de topo | `#rrggbb` | numa subcategoria é ignorado (vem do pai). Sem valor numa categoria de topo, usa a cor padrão |

Nome duplicado (mesmo entre categoria e subcategoria — o nome é único por
conta, não por tipo) → `409`.

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
