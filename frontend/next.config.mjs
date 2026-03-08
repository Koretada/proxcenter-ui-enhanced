import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    basePath: process.env.BASEPATH,
    serverExternalPackages: ['ssh2'],
    experimental: {
        serverActions: {
            bodySizeLimit: '10gb',
        },
        proxyClientMaxBodySize: '10gb',
    },
    turbopack: {
        root: '.',
    },
    redirects: async () => {
        return [
            {
                source: '/',
                destination: '/home',
                permanent: true,
                locale: false
            }
        ];
    }
};

export default withNextIntl(nextConfig);
