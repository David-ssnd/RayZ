import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import SignUpCard from './SignUpCard'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'SignUp' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <div className="relative flex items-center justify-center px-4 min-h-[80vh]">
      <SignUpCard locale={locale} />
    </div>
  )
}
