import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verificarApiKey } from "@/lib/api/auth";
import { lancamentoParaApi } from "@/lib/api/lancamentos";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const marcarApiSchema = z.object({
  pago: z.boolean(),
  // Só fazem sentido com pago:true — omitidos, caem no valor/data previstos
  // do próprio lançamento (mesmo padrão do checkbox "Já paguei" do app).
  valor_pago: z.coerce.number().min(0).optional(),
  data_pagamento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "data_pagamento inválida, use yyyy-mm-dd")
    .optional(),
});

/** PATCH /api/lancamentos/:id/pago
 * Body: { pago: true, valor_pago?, data_pagamento? } ou { pago: false } */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo da requisição precisa ser JSON válido." }, { status: 400 });

  const parsed = marcarApiSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: atual, error: erroBusca } = await admin
    .from("lancamentos")
    .select("valor_previsto, data_prevista")
    .eq("id", id)
    .eq("user_id", env.APP_USER_ID!)
    .single();
  if (erroBusca || !atual) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  const atualizacao = input.pago
    ? {
        pago: true,
        valor_pago: input.valor_pago ?? atual.valor_previsto,
        data_pagamento: input.data_pagamento ?? atual.data_prevista,
      }
    : { pago: false, valor_pago: null, data_pagamento: null };

  const { data, error } = await admin
    .from("lancamentos")
    .update(atualizacao)
    .eq("id", id)
    .eq("user_id", env.APP_USER_ID!)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Não foi possível atualizar." }, { status: 500 });

  const { data: categoria } = await admin.from("categorias").select("nome").eq("id", data.categoria_id).single();

  return NextResponse.json(lancamentoParaApi(data, categoria?.nome ?? "—"));
}
