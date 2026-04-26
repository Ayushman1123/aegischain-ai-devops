import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, CheckCircle, Warning, Lightning, Cloud, Car, Clock, X } from '@phosphor-icons/react'
import type { NotificationAlert } from '@/types'
import { cn } from '@/lib/utils'

interface NotificationCenterProps {
  notifications: NotificationAlert[]
  onClose?: () => void
  onMarkAsRead: (id: string) => void | Promise<void>
  onMarkAllRead: () => void | Promise<void>
}

export function NotificationCenter({ notifications, onClose, onMarkAsRead, onMarkAllRead }: NotificationCenterProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length

  const getIcon = (type: NotificationAlert['type']) => {
    switch (type) {
      case 'eta_update':
        return <Clock size={18} className="text-accent" weight="duotone" />
      case 'delay':
        return <Warning size={18} className="text-warning" weight="duotone" />
      case 'risk_increase':
        return <Lightning size={18} className="text-destructive" weight="duotone" />
      case 'weather':
        return <Cloud size={18} className="text-accent" weight="duotone" />
      case 'traffic':
        return <Car size={18} className="text-warning" weight="duotone" />
      case 'crisis':
        return <Lightning size={18} className="text-destructive" weight="duotone" />
    }
  }

  const getSeverityColor = (severity: NotificationAlert['severity']) => {
    const colors = {
      info: 'border-accent/30 bg-accent/5',
      warning: 'border-warning/30 bg-warning/5',
      error: 'border-destructive/30 bg-destructive/5',
      success: 'border-success/30 bg-success/5',
    }
    return colors[severity]
  }

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={24} className="text-accent" weight="duotone" />
          <div>
            <h3 className="text-lg font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => void onMarkAllRead()}>
              Mark all read
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell size={48} className="mx-auto mb-3 opacity-50" weight="duotone" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  'p-4 border transition-all',
                  !notification.read && 'border-l-4',
                  getSeverityColor(notification.severity)
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-0.5">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5 animate-pulse-glow" />
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(notification.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-mono">{notification.shipmentId}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {notification.actionRequired && (
                          <Badge variant="outline" className="text-xs bg-warning/20 text-warning border-warning/30">
                            Action Required
                          </Badge>
                        )}
                        
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void onMarkAsRead(notification.id)}
                            className="h-7 text-xs"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Mark read
                          </Button>
                        )}

                        {onClose && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-7 w-7 p-0"
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
