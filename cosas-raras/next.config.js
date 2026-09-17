const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    formats: ["image/webp"],
  },
};

module.exports = nextConfig;
