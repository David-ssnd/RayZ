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

type BadgeVariant = 'frontend' | 'backend' | 'hardware' | 'development' | 'database'

interface TechItem {
  key: string
  link: string
  badges: BadgeVariant[]
}

const techStack: TechItem[] = [
  {
    key: 'github',
    link: 'https://github.com',
    badges: ['frontend', 'backend', 'development'],
  },
  {
    key: 'nextjs',
    link: 'https://nextjs.org',
    badges: ['frontend', 'backend'],
  },
  {
    key: 'typescript',
    link: 'https://www.typescriptlang.org',
    badges: ['backend', 'frontend'],
  },
  {
    key: 'tailwind',
    link: 'https://tailwindcss.com',
    badges: ['frontend'],
  },
  {
    key: 'shadcn',
    link: 'https://ui.shadcn.com',
    badges: ['frontend'],
  },
  {
    key: 'esp32',
    link: 'https://www.espressif.com/en/products/socs/esp32',
    badges: ['hardware'],
  },
  {
    key: 'freertos',
    link: 'https://www.freertos.org',
    badges: ['hardware'],
  },
  {
    key: 'platformio',
    link: 'https://platformio.org',
    badges: ['hardware', 'development'],
  },
]

const futureStack: TechItem[] = [
  {
    key: 'prisma',
    link: 'https://www.prisma.io',
    badges: ['backend', 'database'],
  },
  {
    key: 'postgresql',
    link: 'https://www.postgresql.org',
    badges: ['database'],
  },
  {
    key: 'jest',
    link: 'https://jestjs.io',
    badges: ['frontend', 'backend', 'development'],
  },
  {
    key: 'cicd',
    link: 'https://github.com/features/actions',
    badges: ['development'],
  },
  {
    key: 'clangformat',
    link: 'https://clang.llvm.org/docs/ClangFormat.html',
    badges: ['hardware', 'development'],
  },
]

export default async function TechStackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'TechStack' })

  return (
    <PageLayout title={t('title')} description={t('description')}>
      <div className="space-y-8">
        <section>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">
            {t('currentStack')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {techStack.map((item) => (
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

        <section>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">
            {t('futureStack')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {futureStack.map((item) => (
              <Card key={item.key} className="border-dashed border-2 opacity-75">
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
      </div>
    </PageLayout>
  )
}
