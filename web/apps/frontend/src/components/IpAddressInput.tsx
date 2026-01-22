'use client'

import React, { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface IpAddressInputProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function IpAddressInput({ value = '', onChange, className }: IpAddressInputProps) {
  const [octets, setOctets] = useState<string[]>(['', '', '', ''])
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (value) {
      const parts = value.split('.')
      if (parts.length === 4) {
        setOctets(parts)
      }
    } else {
      setOctets(['', '', '', ''])
    }
  }, [value])

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    if (val !== '' && parseInt(val) > 255) return

    const newOctets = [...octets]
    newOctets[index] = val
    setOctets(newOctets)
    onChange?.(newOctets.join('.'))

    if (val.length === 3 && index < 3) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' && index < 3) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
    if (e.key === 'Backspace' && !octets[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const parts = text.split('.')
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p) && parseInt(p) <= 255)) {
      setOctets(parts)
      onChange?.(parts.join('.'))
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {octets.map((octet, index) => (
        <React.Fragment key={index}>
          <Input
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            type="text"
            value={octet}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="w-14 text-center p-2 h-10"
            maxLength={3}
            placeholder="0"
          />
          {index < 3 && <span className="font-bold text-muted-foreground">.</span>}
        </React.Fragment>
      ))}
    </div>
  )
}
