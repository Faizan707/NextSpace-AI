import { FiCpu } from 'react-icons/fi'
import { AiChatWorkspace } from '../components/ai/AiChatWorkspace'

export function AiAssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-6.75rem)] max-w-[1100px] flex-col gap-3">
      <header className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent">
          <FiCpu size={18} aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">AI Assistant</h1>
          <p className="text-sm text-muted">Ask about work or take action in your workspace.</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-line/80 bg-surface shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <AiChatWorkspace />
      </div>
    </div>
  )
}
