import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cube } from '@phosphor-icons/react'
import { toast } from 'sonner'

type AuthScreenProps = {
  isAuthenticating: boolean
  authError: string | null
  onLogin: (name: string, email: string) => Promise<void>
}

export function AuthScreen({ isAuthenticating, authError, onLogin }: AuthScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedName.length < 2) {
      toast.error('Enter a valid name')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Enter a valid email address')
      return
    }

    try {
      await onLogin(normalizedName, normalizedEmail)
      toast.success('Signed in successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background -z-10" />
      <Card className="w-full max-w-md p-8 space-y-6 border-border/80 bg-card/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Cube className="text-primary" size={26} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AegisChain AI</h1>
            <p className="text-sm text-muted-foreground">Secure access required</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Enter your name and Gmail to access the command dashboard.
        </p>

        <p className="text-xs text-muted-foreground/90 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
          Simple login: no password required.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="login-name">Full Name</Label>
            <Input
              id="login-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alex Carter"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-email">Gmail</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@gmail.com"
              autoComplete="email"
              required
            />
          </div>

          {authError && (
            <div className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3">
              {authError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isAuthenticating}>
            {isAuthenticating ? 'Signing in...' : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
