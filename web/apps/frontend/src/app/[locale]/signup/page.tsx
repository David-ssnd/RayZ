import type { Metadata } from 'next'

import SignUpCard from './SignUpCard'

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create your RayZ account.',
}

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <div className="relative flex items-center justify-center px-4 min-h-[80vh]">
      <SignUpCard locale={locale} />
    </div>
  )
}
