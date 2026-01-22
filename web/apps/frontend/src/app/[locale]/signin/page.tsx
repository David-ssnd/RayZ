import type { Metadata } from 'next'

import SignInCard from './SignInCard'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Access your RayZ account.',
}

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <div className="relative flex items-center justify-center px-4 min-h-[80vh]">
      <SignInCard locale={locale} />
    </div>
  )
}
