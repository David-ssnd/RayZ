'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { useParams } from 'next/navigation'
import { usePathname, useRouter } from '@/i18n/routing'
import ReactCountryFlag from 'react-country-flag'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Locale = 'en' | 'sk'

const locales: Record<Locale, { label: string; code: string }> = {
  en: { label: 'English', code: 'GB' },
  sk: { label: 'Slovenčina', code: 'SK' },
}

export function LanguageSwitcher() {
  const [mounted, setMounted] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [isPending, startTransition] = useTransition()

  const currentLocale = (params.locale as Locale) || 'en'

  // Only render after mounting to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  function onSelectChange(nextLocale: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  if (!mounted) {
    // Return a placeholder with the same dimensions during SSR
    return <div className="h-9 w-9" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isPending}>
          <ReactCountryFlag countryCode={locales[currentLocale].code} svg />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(locales) as [Locale, (typeof locales)[Locale]][]).map(
          ([locale, { label, code }]) => (
            <DropdownMenuItem
              key={locale}
              onClick={() => onSelectChange(locale)}
              className="cursor-pointer"
            >
              <ReactCountryFlag countryCode={code} svg className="mr-2" />
              {label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
