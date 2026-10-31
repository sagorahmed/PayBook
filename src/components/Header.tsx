import { useEffect, useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { BookUser, Moon, Sun } from 'lucide-react'

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('paybook:theme', dark ? 'dark' : 'light')
  }, [dark])
  return { dark, toggle: () => setDark((d) => !d) }
}

export function Header() {
  const { dark, toggle } = useTheme()
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 pb-2 pt-5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-2xl" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
          <BookUser className="size-5" />
        </div>
        <span className="display text-xl font-bold">PayBook</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost !px-3" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <ConnectKitButton.Custom>
          {({ isConnected, isConnecting, show, truncatedAddress }) => (
            <button className="btn btn-primary" onClick={show} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : isConnected ? truncatedAddress : 'Connect wallet'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </header>
  )
}
