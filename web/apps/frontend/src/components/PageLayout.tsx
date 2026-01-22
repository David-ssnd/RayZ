interface PageLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm sm:text-base mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
