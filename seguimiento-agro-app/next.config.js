const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client", "exceljs"],
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
