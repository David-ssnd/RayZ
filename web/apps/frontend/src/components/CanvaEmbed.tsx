'use client'

import React from 'react'

interface CanvaEmbedProps {
  url: string // Full Canva URL (e.g., https://www.canva.com/design/DAG1wt58las/r-xa2ln8hKv0UzK1o0MNsA/view)
  userName?: string
  designTitle?: string
  aspectRatio?: number
  className?: string
  showLink?: boolean
}

const CanvaEmbed: React.FC<CanvaEmbedProps> = ({
  url,
  userName = 'používateľ',
  designTitle = '',
  aspectRatio = 16 / 9,
  className = '',
  showLink = true,
}) => {
  // Extract design ID from the URL
  const designIdMatch = url.match(/\/design\/([^\/]+)/)
  const designId = designIdMatch ? designIdMatch[1] : ''

  const paddingTop = `${(1 / aspectRatio) * 100}%`

  const embedUrl = url.includes('?embed') ? url : `${url}?embed`
  const linkUrl = `https://www.canva.com/design/${designId}/view?utm_content=${designId}&utm_campaign=designshare&utm_medium=embeds&utm_source=link`

  return (
    <div className={`canva-embed-container ${className}`}>
      {/* Responzívny iframe kontajner */}
      <div
        className="canva-iframe-wrapper"
        style={{
          position: 'relative' as const,
          width: '100%',
          height: 0,
          paddingTop,
          paddingBottom: 0,
          boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
          marginTop: '1.6em',
          marginBottom: '0.9em',
          overflow: 'hidden',
          borderRadius: '8px',
          willChange: 'transform',
        }}
      >
        <iframe
          loading="lazy"
          style={{
            position: 'absolute' as const,
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            border: 'none',
            padding: 0,
            margin: 0,
          }}
          src={embedUrl}
          allowFullScreen
          allow="fullscreen"
          title={`${designTitle || 'Canva'} prezentácia`}
        />
      </div>

      {/* Odkaz na Canva (voliteľný) */}
      {showLink && (
        <div className="canva-credit">
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="canva-link"
            style={{
              color: '#666',
              textDecoration: 'none',
              fontSize: '0.9em',
              marginTop: '0.5em',
              display: 'inline-block',
            }}
          >
            {designTitle || 'Prezentácia'} od používateľa {userName}
          </a>
        </div>
      )}
    </div>
  )
}

export default CanvaEmbed
