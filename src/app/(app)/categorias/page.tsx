import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApagarCategoriaButton } from "@/features/categorias/apagar-categoria-button";
import { GrupoFormDialog } from "@/features/categorias/grupo-form-dialog";
import { SubgrupoFormDialog } from "@/features/categorias/subgrupo-form-dialog";
import { getGruposComSubgrupos } from "@/lib/data/categorias";

export default async function CategoriasPage() {
  const grupos = await getGruposComSubgrupos();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <GrupoFormDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Novo grupo
            </Button>
          }
        />
      </div>

      {grupos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo ainda. Crie o primeiro (ex.: &quot;Despesas Fixas&quot;) para começar.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {grupos.map((grupo) => (
          <Card key={grupo.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: grupo.cor }} />
                <CardTitle className="text-base font-semibold text-foreground">{grupo.nome}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {grupo.tipo === "entrada" ? "Entrada" : "Saída"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <GrupoFormDialog
                  grupo={grupo}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  }
                />
                <ApagarCategoriaButton id={grupo.id} nome={grupo.nome} tipo="grupo" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {grupo.subgrupos.map((subgrupo) => (
                <div key={subgrupo.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                  <span>{subgrupo.nome}</span>
                  <div className="flex items-center gap-1">
                    <SubgrupoFormDialog
                      grupoId={grupo.id}
                      subgrupo={subgrupo}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <ApagarCategoriaButton id={subgrupo.id} nome={subgrupo.nome} tipo="subgrupo" />
                  </div>
                </div>
              ))}
              {grupo.subgrupos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum subgrupo ainda.</p>
              )}
              <SubgrupoFormDialog
                grupoId={grupo.id}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="size-4" /> Subgrupo
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
