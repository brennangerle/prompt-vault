import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Only apply webpack config when not using Turbopack
    if (process.env.NODE_ENV === 'production' && !process.env.TURBOPACK) {
      // Suppress Handlebars require.extensions warning
      config.ignoreWarnings = [
        {
          module: /node_modules\/handlebars\/lib\/index\.js/,
          message: /require\.extensions is not supported by webpack/,
        },
      ];
    }
    
    return config;
  },
  // Turbopack configuration for development
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
