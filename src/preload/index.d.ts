import type { SwitchoidApi } from '@shared/types'

declare global {
  interface Window {
    switchoid: SwitchoidApi
  }
}

export {}
