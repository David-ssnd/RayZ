import type { Metadata } from 'next'
import { getDevices } from '@/features/devices/actions'
import { getGameModes, getProjects } from '@/features/projects/actions'
import { getTranslations } from 'next-intl/server'

import { ProjectManagerClient } from '@/components/ProjectManagerClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Control' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ControlPanelPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Control' })

  const devices = await getDevices()
  const projects = await getProjects()
  const gameModes = await getGameModes()

  return (
    <ProjectManagerClient projects={projects} availableDevices={devices} gameModes={gameModes} />
  )
}
