import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CommDemoClient } from './client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'WSDemo' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function CommDemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return <CommDemoClient locale={locale} />
}
