import { memo } from 'react'
import landscape from '../assets/landscape.webp'

export const Backdrop = memo(function Backdrop() {
  return <div className="scene" aria-hidden="true" style={{ backgroundImage: `url(${landscape})` }} />
})
