'use client'

import { Button } from '@payloadcms/ui'
import { useState } from 'react'

type Status = 'idle' | 'running' | 'complete' | 'error'

export const RemoveDuplicateMediaButton = () => {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const removeDuplicates = async () => {
    const confirmed = window.confirm(
      'Remove duplicate image records? The oldest copy of each identical file will be kept.',
    )

    if (!confirmed) return

    try {
      setStatus('running')
      setMessage('Scanning images and removing duplicates...')

      const response = await fetch('/api/maintenance/remove-duplicate-media', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.errors?.[0]?.message || 'Unable to remove duplicates.')
      }

      setStatus('complete')
      setMessage(
        result.deleted
          ? `Removed ${result.deleted} duplicate image${result.deleted === 1 ? '' : 's'} from ${result.scanned} scanned.`
          : `No duplicates found across ${result.scanned} images.`,
      )
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to remove duplicates.')
    }
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <Button buttonStyle="secondary" disabled={status === 'running'} onClick={removeDuplicates} type="button">
        {status === 'running' ? 'Removing duplicates…' : 'Remove duplicates'}
      </Button>
      {message && (
        <p role="status" style={{ marginTop: '0.5rem' }}>
          {message}
        </p>
      )}
    </div>
  )
}
