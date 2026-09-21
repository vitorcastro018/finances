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

## Autenticação (header — toda rota)

Todo request, de qualquer endpoint abaixo, leva este header:

| Header | Obrigatório | Valor |
|---|---|---|
| `Authorization` | Sim | `Bearer <API_KEY>` |

Sem isso (ou com a chave errada), a resposta é `401`. Sem `API_KEY`,
`APP_USER_ID` ou `SUPABASE_SERVICE_ROLE_KEY` configurados no servidor, a
resposta é `500` antes mesmo de checar o header.

Todo `POST`/`PATCH` (corpo em JSON) também leva:

| Header | Obrigatório | Valor |
|---|---|---|
| `Content-Type` | Sim | `application/json` |

## Onde cada parâmetro vai

Pra não confundir na hora de montar o request:

- **Path parameter** — faz parte da própria URL (ex.: o `:id` em `/api/lancamentos/:id/pago`).
- **Query parameter** — vai depois do `?` na URL (ex.: `?mes=2026-09&tipo=saida`). Só existe em `GET`.
- **Body parameter** — vai no corpo JSON do request (`-d '{...}'` no curl). Só existe em `POST`/`PATCH`.

## Endpoints

### `POST /api/lancamentos` — criar um lançamento

Sem path parameters. Sem query parameters. Todos os campos abaixo vão no
**corpo JSON** (body parameters):

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `nome` | string (máx. 120) | Sim | — | Nome do lançamento. |
| `tipo` | `"entrada"` \| `"saida"` | Sim | — | |
| `categoria` | string | Sim | — | **Nome** (não uuid) de uma categoria de topo já cadastrada. Comparação sem diferenciar maiúscula/minúscula. |
| `subcategoria` | string | Não | — | **Nome** de uma subcategoria já cadastrada dentro de `categoria`. Presente, o lançamento fica ligado a ela (não à categoria de topo) — ver nota abaixo. |
| `valor_previsto` | number ≥ 0 | Sim | — | |
| `data_prevista` | string `yyyy-mm-dd` | Não | hoje | Sem `cartao`: data de vencimento (ou compra à vista). **Com `cartao`: data DA COMPRA** — a rota calcula sozinha em qual fatura ela cai e grava o vencimento nesse campo. |
| `metodo` | string (máx. 60) | Não | — | Livre (ex.: "Pix", "Débito"). |
| `pago` | boolean | Não | `false` | `true` já lança como pago, usando o próprio valor/data previstos (já resolvidos pra fatura, se houver cartão) como reais — igual o checkbox "Já paguei" do formulário. |
| `cartao` | string | Não | — | **Nome** de um cartão ativo já cadastrado (ver `GET /api/cartoes`). Sem ele, o lançamento não fica ligado a nenhum cartão. |

Exemplo:

```bash
curl -X POST https://SEU-APP.vercel.app/api/lancamentos \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Cinema",
    "tipo": "saida",
    "categoria": "Lazer",
    "subcategoria": "Cinema",
    "valor_previsto": 45.00,
    "data_prevista": "2026-09-15",
    "metodo": "Pix",
    "pago": false,
    "cartao": "Nubank"
  }'
```

Notas de validação:
- Se `categoria` não bater com nenhuma categoria de topo cadastrada (do mesmo `tipo`), a resposta `400` lista as categorias disponíveis daquele tipo.
- Se `subcategoria` não existir dentro da `categoria` informada, `400` lista as subcategorias disponíveis ali.
- Se `cartao` não bater com nenhum cartão ativo, `400` lista os cartões disponíveis.
- Com `subcategoria`, o campo `categoria` da **resposta** mostra o nome da subcategoria, não o da categoria de topo — mesmo comportamento da tela (o lançamento está ligado ao id da subcategoria, e é esse nome que aparece).

Resposta `201`: o lançamento criado, no mesmo formato do `GET` abaixo.

### `GET /api/lancamentos` — listar/buscar

Sem path parameters. Sem corpo (GET não leva body). Todos os filtros abaixo
vão na **query string** (query parameters), todos opcionais:

| Param | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `mes` | string `yyyy-mm` ou `"todos"` | Não | mês atual | |
| `tipo` | `"entrada"` \| `"saida"` | Não | — | |
| `categoria` | string | Não | — | Nome da categoria de topo. **Exige `tipo` junto.** |
| `subcategoria` | string | Não | — | Nome da subcategoria dentro de `categoria`. **Exige `categoria` junto.** |
| `cartao` | string | Não | — | Nome de um cartão (ativo). |
| `pago` | `"true"` \| `"false"` | Não | — | |
| `busca` | string (máx. 120) | Não | — | Texto livre, procura no nome. |

`categoria` sozinho filtra só os lançamentos ligados exatamente a essa
categoria de topo — não inclui os lançados numa subcategoria dela (mesmo
comportamento do filtro na tela). Pra pegar só os de uma subcategoria
específica, use `categoria` + `subcategoria` juntos.

Exemplo:

```bash
curl "https://SEU-APP.vercel.app/api/lancamentos?mes=2026-09&tipo=saida&categoria=Lazer&subcategoria=Cinema&pago=false" \
  -H "Authorization: Bearer $API_KEY"
```

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

| Parâmetro | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | **path** | uuid | Sim | Id do lançamento, na própria URL. |

Sem query parameters. Corpo JSON (body parameters):

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `pago` | boolean | Sim | — | `true` marca como pago; `false` desmarca (limpa `valor_pago`/`data_pagamento`). |
| `valor_pago` | number ≥ 0 | Não | valor previsto do lançamento | Só faz sentido com `pago: true`. |
| `data_pagamento` | string `yyyy-mm-dd` | Não | data prevista do lançamento | Só faz sentido com `pago: true`. |

Exemplo:

```bash
curl -X PATCH https://SEU-APP.vercel.app/api/lancamentos/UUID-DO-LANCAMENTO/pago \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pago": true, "valor_pago": 190.00, "data_pagamento": "2026-09-16"}'
```

Resposta `200`: o lançamento atualizado (mesmo formato do `GET /api/lancamentos`). `404` se o `id` não existir.

### `GET /api/indicadores` — os números do dashboard

Sem path parameters. Sem corpo. Query parameters:

| Param | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `mes` | string `yyyy-mm` | Não | mês atual | Sem opção `"todos"` aqui — indicador é sempre de um mês. |

Exemplo:

```bash
curl "https://SEU-APP.vercel.app/api/indicadores?mes=2026-09" \
  -H "Authorization: Bearer $API_KEY"
```

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

Sem path parameters. Sem corpo. Query parameters:

| Param | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `tipo` | `"entrada"` \| `"saida"` | Não | ambos | |

Exemplo:

```bash
curl "https://SEU-APP.vercel.app/api/categorias?tipo=saida" \
  -H "Authorization: Bearer $API_KEY"
```

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

Sem path parameters. Sem query parameters. Corpo JSON (body parameters):

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `nome` | string (máx. 60) | Sim | — | |
| `tipo` | `"entrada"` \| `"saida"` | **Sim pra categoria de topo** (sem `categoria_pai`) | — | Ignorado numa subcategoria — vem do pai. |
| `cor` | string `#rrggbb` | Não | cor padrão | Só vale pra categoria de topo — numa subcategoria é ignorado (vem do pai). |
| `categoria_pai` | string | Não | — | **Nome** de uma categoria de topo já existente. Presente = cria uma subcategoria dentro dela; ausente = cria categoria de topo (exige `tipo` nesse caso). |

Categoria de topo:

```bash
curl -X POST https://SEU-APP.vercel.app/api/categorias \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Lazer", "tipo": "saida"}'
```

Subcategoria — `tipo`/`cor` vêm sempre do pai (mesma regra da tela: não dá pra escolher à parte):

```bash
curl -X POST https://SEU-APP.vercel.app/api/categorias \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Cinema", "categoria_pai": "Lazer"}'
```

Notas de validação:
- Nome duplicado (mesmo entre categoria e subcategoria — o nome é único por conta, não por tipo) → `409`.
- `categoria_pai` que não existir → `400`, listando as categorias de topo disponíveis.
- Sem `categoria_pai` e sem `tipo` → `400` pedindo um dos dois.

Resposta `201`:

```json
{ "id": "...", "nome": "Cinema", "tipo": "saida", "cor": "#64748b", "categoria_pai": "Lazer" }
```

### `GET /api/cartoes` — listar cartões ativos

Sem path parameters. Sem query parameters. Sem corpo.

```bash
curl "https://SEU-APP.vercel.app/api/cartoes" \
  -H "Authorization: Bearer $API_KEY"
```

Sempre lista todos os cartões ativos (mesmo filtro do `<select>` no
formulário). Use os `nome` daqui nos campos `cartao` de
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
