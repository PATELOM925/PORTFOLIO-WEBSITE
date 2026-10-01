/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // 1Pour is professional experience, not a public project page.
    return [{ source: "/projects/barlens", destination: "/#experience", permanent: true }];
  },
  experimental: {
    mdxRs: true
  }
};

export default nextConfig;
