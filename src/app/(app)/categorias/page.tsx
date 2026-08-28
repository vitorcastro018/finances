import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApagarCategoriaButton } from "@/features/categorias/apagar-categoria-button";
import { CategoriaFormDialog } from "@/features/categorias/categoria-form-dialog";
import { SubcategoriaFormDialog } from "@/features/categorias/subcategoria-form-dialog";
import { getCategoriasComSubcategorias } from "@/lib/data/categorias";

export default async function CategoriasPage() {
  const categorias = await getCategoriasComSubcategorias();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <CategoriaFormDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Nova categoria
            </Button>
          }
        />
      </div>

      {categorias.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria ainda. Crie a primeira (ex.: &quot;Aluguel&quot;) para começar.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {categorias.map((categoria) => (
          <Card key={categoria.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: categoria.cor }} />
                <CardTitle className="text-base font-semibold text-foreground">{categoria.nome}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {categoria.tipo === "entrada" ? "Entrada" : "Saída"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CategoriaFormDialog
                  categoria={categoria}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  }
                />
                <ApagarCategoriaButton id={categoria.id} nome={categoria.nome} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoria.subcategorias.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                  <span>{sub.nome}</span>
                  <div className="flex items-center gap-1">
                    <CategoriaFormDialog
                      categoria={sub}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <ApagarCategoriaButton id={sub.id} nome={sub.nome} />
                  </div>
                </div>
              ))}
              {categoria.subcategorias.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma subcategoria ainda.</p>
              )}
              <SubcategoriaFormDialog
                categoriaPai={categoria}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="size-4" /> Subcategoria
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
