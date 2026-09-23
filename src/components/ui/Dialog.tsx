import * as RadixDialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal forceMount>
        <AnimatePresence>
          {open && [
            <RadixDialog.Overlay key="overlay" asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </RadixDialog.Overlay>,
            <div key="content" className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <RadixDialog.Content asChild forceMount>
                <motion.div
                  className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl focus:outline-none"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div>
                      <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
                      {description && (
                        <RadixDialog.Description className="mt-1 text-sm text-muted-foreground">
                          {description}
                        </RadixDialog.Description>
                      )}
                    </div>
                    <RadixDialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Kapat"
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted"
                      >
                        <X className="size-4" />
                      </button>
                    </RadixDialog.Close>
                  </div>
                  {children}
                </motion.div>
              </RadixDialog.Content>
            </div>,
          ]}
        </AnimatePresence>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
