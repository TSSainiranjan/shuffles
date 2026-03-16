import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.log('SW registration failed: ', err)
        })
      })
    }
  }, [])

  return (
    <div className="font-sans antialiased [overflow-wrap:anywhere]">
      <Outlet />
    </div>
  )
}
