import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Permite subir el voucher de pago (imágenes de hasta 5 MB) desde la página del pedido
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
