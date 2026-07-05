/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lirp.cdn-website.com" },
      { protocol: "https", hostname: "irp.cdn-website.com" },
    ],
  },
};

export default nextConfig;
