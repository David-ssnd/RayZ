import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout } from '@/components/PageLayout'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'TechStack' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

type BadgeVariant =
  | 'frontend'
  | 'backend'
  | 'hardware'
  | 'development'
  | 'database'
  | 'protocol'

interface TechItem {
  key: string
  link: string
  badges: BadgeVariant[]
}

interface TechSection {
  key: string
  items: TechItem[]
}

const sections: TechSection[] = [
  {
    key: 'webFrontend',
    items: [
      { key: 'nextjs', link: 'https://nextjs.org', badges: ['frontend', 'backend'] },
      { key: 'react', link: 'https://react.dev', badges: ['frontend'] },
      { key: 'typescript', link: 'https://www.typescriptlang.org', badges: ['frontend', 'backend'] },
      { key: 'tailwind', link: 'https://tailwindcss.com', badges: ['frontend'] },
      { key: 'shadcn', link: 'https://ui.shadcn.com', badges: ['frontend'] },
      { key: 'radixui', link: 'https://www.radix-ui.com', badges: ['frontend'] },
      { key: 'lucide', link: 'https://lucide.dev', badges: ['frontend'] },
      { key: 'nextintl', link: 'https://next-intl.dev', badges: ['frontend'] },
      { key: 'nextthemes', link: 'https://github.com/pacocoursey/next-themes', badges: ['frontend'] },
    ],
  },
  {
    key: 'backendData',
    items: [
      { key: 'nodejs', link: 'https://nodejs.org', badges: ['backend'] },
      { key: 'nextauth', link: 'https://authjs.dev', badges: ['backend'] },
      { key: 'prisma', link: 'https://www.prisma.io', badges: ['backend', 'database'] },
      { key: 'postgresql', link: 'https://www.postgresql.org', badges: ['database'] },
      { key: 'sqlite', link: 'https://www.sqlite.org', badges: ['database'] },
      { key: 'zod', link: 'https://zod.dev', badges: ['backend'] },
    ],
  },
  {
    key: 'communication',
    items: [
      {
        key: 'websocket',
        link: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
        badges: ['protocol', 'backend'],
      },
      { key: 'msgpack', link: 'https://msgpack.org', badges: ['protocol'] },
      { key: 'mdns', link: 'https://en.wikipedia.org/wiki/Multicast_DNS', badges: ['protocol', 'hardware'] },
      { key: 'openapi', link: 'https://www.openapis.org', badges: ['backend', 'protocol'] },
    ],
  },
  {
    key: 'hardware',
    items: [
      {
        key: 'esp32',
        link: 'https://www.espressif.com/en/products/socs/esp32',
        badges: ['hardware'],
      },
      {
        key: 'espidf',
        link: 'https://docs.espressif.com/projects/esp-idf/en/latest/',
        badges: ['hardware'],
      },
      { key: 'freertos', link: 'https://www.freertos.org', badges: ['hardware'] },
      { key: 'platformio', link: 'https://platformio.org', badges: ['hardware', 'development'] },
      { key: 'lvgl', link: 'https://lvgl.io', badges: ['hardware'] },
      { key: 'cplusplus', link: 'https://isocpp.org', badges: ['hardware'] },
    ],
  },
  {
    key: 'devops',
    items: [
      { key: 'turborepo', link: 'https://turbo.build', badges: ['development'] },
      { key: 'pnpm', link: 'https://pnpm.io', badges: ['development'] },
      { key: 'docker', link: 'https://www.docker.com', badges: ['development'] },
      { key: 'githubactions', link: 'https://github.com/features/actions', badges: ['development'] },
      { key: 'github', link: 'https://github.com', badges: ['development'] },
      { key: 'eslint', link: 'https://eslint.org', badges: ['development'] },
      { key: 'prettier', link: 'https://prettier.io', badges: ['development'] },
      {
        key: 'clangformat',
        link: 'https://clang.llvm.org/docs/ClangFormat.html',
        badges: ['hardware', 'development'],
      },
      { key: 'playwright', link: 'https://playwright.dev', badges: ['development'] },
    ],
  },
]

const totalTechCount = sections.reduce((sum, section) => sum + section.items.length, 0)

export default async function TechStackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'TechStack' })

  return (
    <PageLayout title={t('title')} description={t('description')}>
      <div className="space-y-10">
        {/* Project Identity Hero */}
        <section className="rounded-xl border bg-card/50 p-6 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t('hero.title')}</h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-3xl">
              {t('hero.description')}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="frontend">{t('hero.tagWeb')}</Badge>
              <Badge variant="hardware">{t('hero.tagHardware')}</Badge>
              <Badge variant="protocol">{t('hero.tagRealtime')}</Badge>
              <Badge variant="backend">{t('hero.tagFullstack')}</Badge>
              <span className="text-muted-foreground text-xs ml-2">
                {t('hero.techCount', { count: totalTechCount })}
              </span>
            </div>
          </div>
        </section>

        {/* Tech Sections */}
        {sections.map((section) => (
          <section key={section.key} className="space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                {t(`sections.${section.key}.title`)}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {t(`sections.${section.key}.description`)}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {section.items.map((item) => (
                <Card key={item.key}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-row justify-between items-center">
                      <CardTitle className="text-base">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline cursor-default"
                        >
                          {t(`items.${item.key}.name`)}
                        </a>
                      </CardTitle>
                      <div className="flex flex-row flex-wrap gap-1">
                        {item.badges.map((badge) => (
                          <Badge key={`${item.key}-${badge}`} variant={badge}>
                            {t(`badges.${badge}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{t(`items.${item.key}.description`)}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageLayout>
  )
}
