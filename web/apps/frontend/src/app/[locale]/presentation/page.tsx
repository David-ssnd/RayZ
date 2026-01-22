import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import CanvaEmbed from '@/components/CanvaEmbed'
import { PageLayout } from '@/components/PageLayout'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Presentation' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Presentation' })

  return (
    <PageLayout title={t('title')} description={t('description')}>
      <div className="space-y-6">
        <CanvaEmbed
          url="https://www.canva.com/design/DAG1wt58las/r-xa2ln8hKv0UzK1o0MNsA/view?embed"
          userName="Dávid Krivoklatský"
          designTitle="RayZ"
          aspectRatio={16 / 9}
        />
      </div>
    </PageLayout>
  )
}
