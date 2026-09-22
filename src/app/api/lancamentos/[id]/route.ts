import { NextResponse, type NextRequest } from "next/server";

import { verificarApiKey } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** DELETE /api/lancamentos/:id */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const { id } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lancamentos")
    .delete()
    .eq("id", id)
    .eq("user_id", env.APP_USER_ID!)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
