import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import type { HardwareDevice } from '@/types/hardware'
import { ConnectedDevicesCard } from '@/components/hardware/ConnectedDevicesCard'
import { HardwareDeviceCard } from '@/components/hardware/HardwareDeviceCard'
import { PageLayout } from '@/components/PageLayout'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Hardware' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function HardwarePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Hardware' })

  const mockDevices: HardwareDevice[] = [
    {
      name: t('targetDevice.name'),
      microcontroller: 'ESP32-C3 Supermini',
      scheme_img_url: '/schemes/target.svg',
      real_img_url: '/hardware/target.jpeg',
      description: t('targetDevice.description'),
      badge: t('targetDevice.badge'),
      badgeVariant: 'Target',
    },
    {
      name: t('weaponDevice.name'),
      microcontroller: 'ESP32-WROOM',
      scheme_img_url: '/schemes/weapon.svg',
      real_img_url: '/hardware/weapon.jpeg',
      description: t('weaponDevice.description'),
      badge: t('weaponDevice.badge'),
      badgeVariant: 'BowArrow',
    },
  ]

  const connectedDevice: HardwareDevice = {
    name: t('connectedDevices.name'),
    microcontroller: t('connectedDevices.microcontroller'),
    real_img_url: '/hardware/weapon-target.jpeg',
    description: t('connectedDevices.description'),
  }

  return (
    <PageLayout title={t('title')} description={t('description')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {mockDevices.map((device) => (
          <HardwareDeviceCard key={device.name} {...device} />
        ))}
      </div>
      <ConnectedDevicesCard {...connectedDevice} />
    </PageLayout>
  )
}
