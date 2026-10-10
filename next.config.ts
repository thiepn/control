import type { NextConfig } from 'next';
// A reproducibility probe may pin its build ID to the independently verified source SHA.
const probeHead=process.env.CONTROL_P10_BUILD_HEAD;
if(probeHead && (!/^[a-f0-9]{40}$/.test(probeHead) ||
 probeHead!==process.env.CONTROL_P10_EXPECTED_HEAD)) {
 throw new Error('P10 reproducibility build ID is not the exact reviewed source SHA');
}
const config: NextConfig = {
  ...(probeHead ? { generateBuildId: async () => probeHead } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cache-Control', value: 'private, no-store' }
  ] }]; }
};
export default config;
