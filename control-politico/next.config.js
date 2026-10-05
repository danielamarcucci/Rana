const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client"],
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
