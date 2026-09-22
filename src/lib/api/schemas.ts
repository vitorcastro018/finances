import { z } from "zod";

/** Campo booleano que aceita tanto `true`/`false` de verdade quanto a string
 * "true"/"false" — alguns clientes HTTP (n8n incluído) mandam tudo como
 * string no JSON, o que fazia `z.boolean()` rejeitar o request com `400`
 * mesmo o valor sendo óbvio. */
export const booleanApiSchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((valor) => (typeof valor === "string" ? valor === "true" : valor));
