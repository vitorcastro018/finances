import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Padrão é 1mb — pouco pra uma foto de comprovante tirada com celular.
      // Vale junto com o limite de tamanho em src/lib/anexos.ts (8 MB).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
