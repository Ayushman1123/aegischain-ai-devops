import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatCircleDots, PaperPlaneTilt, Robot, X } from '@phosphor-icons/react'
import type { SupportMessage } from '@/lib/api'

type SupportChatbotProps = {
  messages: SupportMessage[]
  onSend: (message: string) => Promise<void>
}

export function SupportChatbot({ messages, onSend }: SupportChatbotProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const trimmed = message.trim()
    if (!trimmed || sending) {
      return
    }

    setSending(true)
    try {
      await onSend(trimmed)
      setMessage('')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <Button
        className="fixed bottom-6 right-6 z-50 gap-2 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <ChatCircleDots size={18} weight="duotone" />
        Support Chat
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden border-border/80 bg-card/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Robot size={18} className="text-accent" weight="duotone" />
          <div>
            <h3 className="text-sm font-semibold">Support Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask about agents, tracking, or risk.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <Card className="border-dashed p-3 text-sm text-muted-foreground">
              Ask how to assign work to an agent, run analysis, or use the live map.
            </Card>
          )}

          {messages.map((entry) => (
            <div
              key={entry.id}
              className={entry.role === 'assistant' ? 'mr-6' : 'ml-6'}
            >
              <div className={entry.role === 'assistant' ? 'rounded-xl bg-accent/10 p-3 text-sm' : 'rounded-xl bg-primary/10 p-3 text-sm'}>
                {entry.message}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask for help..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleSend()
              }
            }}
          />
          <Button size="icon" onClick={() => void handleSend()} disabled={sending}>
            <PaperPlaneTilt size={16} weight="fill" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
