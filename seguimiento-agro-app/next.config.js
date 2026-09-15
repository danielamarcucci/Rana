const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client", "exceljs"],
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    // Definido explícitamente además de tsconfig "paths": en despliegues
    // donde este proyecto vive en una subcarpeta del repositorio (monorepo),
    // la detección automática del alias "@/*" desde tsconfig puede fallar.
    config.resolve.alias["@"] = path.join(__dirname, "src");
    return config;
  },
};

module.exports = nextConfig;
