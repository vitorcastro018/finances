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
    "pago": false
  }'
```

- `nome`, `tipo` (`"entrada"` ou `"saida"`), `categoria` (**nome**, não id — precisa já existir) e `valor_previsto` são obrigatórios.
- `data_prevista` (`yyyy-mm-dd`) é opcional — sem ela, usa hoje.
- `metodo` é opcional.
- `pago` é opcional (padrão `false`) — `true` já lança como pago, usando o próprio valor/data previstos como reais (igual o checkbox "Já paguei" do formulário).
- Se `categoria` não bater com nenhuma categoria de topo cadastrada (comparação sem diferenciar maiúscula/minúscula), a resposta `400` lista as categorias disponíveis daquele tipo.

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
  "metodo": "Pix"
}
```

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

## O que não tem (por enquanto)

Anexo de comprovante, parcelamento e contas fixas não têm endpoint — só o
que foi pedido pro agente (criar lançamento, consultar indicadores,
listar/buscar, marcar como pago). Dá pra adicionar do mesmo jeito depois.
