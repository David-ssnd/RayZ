'use client'

import { useState, type FormEvent, type SVGProps } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type SignUpCardProps = {
  locale: string
}

type Mode = 'magic' | 'password'

export default function SignUpCard({ locale }: SignUpCardProps) {
  const [mode, setMode] = useState<Mode>('password')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const callbackUrl = `/${locale}/control`

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // 1. Register the user
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!registerRes.ok) {
        const data = await registerRes.json()
        throw new Error(data.error || 'Registration failed')
      }

      // 2. Sign in the user
      const result = (await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })) as Awaited<ReturnType<typeof signIn>>

      if (result?.error) {
        setError('Registration successful, but failed to sign in automatically. Please sign in.')
        return
      }

      if (result?.url) {
        window.location.assign(result.url)
      }
    } catch (err: any) {
      console.error('Failed to sign up', err)
      setError(err.message || 'Something went wrong. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleProvider(provider: 'github' | 'google') {
    void signIn(provider, { callbackUrl })
  }

  return (
    <Card className="w-full max-w-md border-transparent bg-white/95 text-foreground shadow-[0_25px_60px_rgba(15,23,42,0.15)] ring-1 ring-black/5 backdrop-blur dark:border-white/5 dark:bg-neutral-950/80 dark:ring-white/10">
      <CardHeader className="gap-3 text-center">
        <CardTitle className="text-2xl font-semibold leading-tight sm:text-3xl">
          Create an account
        </CardTitle>
        <CardDescription>
          Already have an account?{' '}
          <Link
            href={`/${locale}/signin`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 justify-start gap-3 text-base"
            onClick={() => handleProvider('github')}
          >
            <GitHubIcon className="size-5" />
            Sign up with GitHub
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 justify-start gap-3 text-base"
            onClick={() => handleProvider('google')}
          >
            <GoogleIcon className="size-5" />
            Sign up with Google
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Or continue with
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/80 p-1 text-sm font-medium">
            {(
              [
                { key: 'magic', label: 'Magic Link' },
                { key: 'password', label: 'Password' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={cn(
                  'rounded-lg px-3 py-2 transition-all',
                  mode === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'magic' ? (
            <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
              <div className="space-y-2">
                <label htmlFor="magic-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="magic-email"
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <Button className="w-full" disabled title="Magic link delivery is coming soon">
                Send magic link
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Magic link sign-up will be available soon.
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
      {...props}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
    </svg>
  )
}

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width="100"
      height="100"
      viewBox="0 0 48 48"
      {...props}
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      ></path>
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      ></path>
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      ></path>
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      ></path>
    </svg>
  )
}
