import { dirname } from 'path'
import { fileURLToPath } from 'url'
import createNextIntlPlugin from 'next-intl/plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const repoRoot = __dirname.replace(/apps[\\\/]frontend$/, '')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig = {
  transpilePackages: ['@rayz/types', '@rayz/database'],
  turbopack: {
    root: repoRoot,
  },
}

export default withNextIntl(nextConfig)
