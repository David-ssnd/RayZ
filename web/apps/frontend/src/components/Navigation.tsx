'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { Cpu, ExternalLink, LogOut, Menu, User } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  VisuallyHidden,
} from '@/components/ui/sheet'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'

export function Navigation() {
  const t = useTranslations('Navigation')
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { label: t('control'), href: '/control' },
    { label: t('presentation'), href: '/presentation' },
    { label: t('hardware'), href: '/hardware' },
    { label: t('techStack'), href: '/techstack' },
  ]
  const pathname = usePathname()
  // Extract locale from pathname (assumes /[locale]/... structure)
  const locale = pathname?.split('/')[1] ? '/' + pathname.split('/')[1] : ''

  const externalItems = [
    { label: t('github'), href: 'https://github.com/David-ssnd/RayZ' },
    {
      label: t('documentation'),
      href: 'https://docs.google.com/document/d/1u_znfRPnOI1DHgK9Md7V5L7YhYJi6iWcMULM_RJ-6mI/edit?usp=sharing',
    },
  ]

  return (
    <>
      {/* Desktop Navigation (md and up) */}
      <div className="hidden md:flex items-center justify-between w-full gap-4">
        {/* Logo */}
        <img src="/rayz-trim.svg" alt="RayZ" className="h-8 w-auto object-contain shrink-0" />

        {/* Desktop Navigation Menu */}
        <div className="flex items-center flex-1 lg:gap-0 md:gap-0">
          <NavigationMenu>
            <NavigationMenuList className="md:gap-0 lg:gap-1">
              {navItems.map((item) => {
                const isActive = pathname === locale + item.href
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      asChild
                      className={navigationMenuTriggerStyle() + (isActive ? ' bg-accent' : '')}
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              })}
              {externalItems.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                      <div className="flex items-center gap-1">
                        {item.label}
                        <ExternalLink className="h-4 w-4" />
                      </div>
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Desktop Theme & Language Switchers */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/signin">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation (under md) */}
      <div className="flex md:hidden items-center justify-between w-full">
        {/* Mobile Menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
            </VisuallyHidden>
            <div className="flex flex-col space-y-4 mt-8">
              {navItems.map((item) => {
                const isActive = pathname === locale + item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium hover:underline ${isActive ? 'border-l-4 border-primary pl-2' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <div className="border-t pt-4 space-y-2">
                {externalItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    {item.label}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Theme & Language Switchers */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/signin">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
