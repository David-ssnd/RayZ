import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import SignInCard from './SignInCard'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'SignIn' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <div className="relative flex items-center justify-center px-4 min-h-[80vh]">
      <SignInCard locale={locale} />
    </div>
  )
}
