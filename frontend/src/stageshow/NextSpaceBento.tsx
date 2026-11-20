import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Avatar,
  Bar,
  Count,
  Facepile,
  Icon,
  Meter,
  Stage,
  Text,
  useReducedMotion,
  type Act,
} from './kit'
import './NextSpaceBento.css'

// NextSpace features bento — redesigned.
// Hero UI (mention assign) · Stat · Board component · Spaces · Mentions facepile

const STEP = 100
const LEAD = 380

type Beat = { on: boolean }
const before: Beat = { on: false }
const after: Beat = { on: true }
const beat = (i: number) => async (a: Act<Beat>) => {
  await a.wait(LEAD + i * STEP)
  await a.set({ on: true })
}

function Tile({
  area,
  lead,
  body,
  children,
  picture,
}: {
  area: string
  lead?: ReactNode
  body?: ReactNode
  children?: ReactNode
  picture?: ReactNode
}) {
  return (
    <section className={`nsb-tile nsb-tile--${area}`} data-crop>
      {(lead || body) && (
        <header className="nsb-head">
          {lead ? <h3 className="nsb-lead">{lead}</h3> : null}
          {body ? <p className="nsb-body">{body}</p> : null}
        </header>
      )}
      {children}
      {picture}
    </section>
  )
}

function usePictureWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setWidth(Math.max(1, node.getBoundingClientRect().width))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function useInView<T extends Element>(delay: number) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let t = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        t = window.setTimeout(() => setSeen(true), delay)
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [delay])
  return [ref, seen] as const
}

function HeroAssign() {
  const [picture, width] = usePictureWidth()
  return (
    <Tile
      area="hero"
      lead="AI that takes the action"
      body="@ someone in chat — the task lands on the board with them."
      picture={
        <div ref={picture} className="nsb-picture nsb-picture--hero">
          <Stage<Beat>
            width={width}
            height={248}
            initial={before}
            poster={after}
            play="once"
            script={beat(0)}
            accent="#2563eb"
            greys="cool"
            className="nsb-stage"
          >
            {(s) => (
              <div className="nsb-hero-scene">
                <div className="nsb-hero-chat">
                  <div className="nsb-hero-chat-bar">
                    <span className="nsb-hero-dots" aria-hidden>
                      <i />
                      <i />
                      <i />
                    </span>
                    <Text className="nsb-hero-chat-title">NextSpace · AI</Text>
                    <span className="nsb-hero-live">Live</span>
                  </div>
                  <div className="nsb-hero-thread">
                    <div className="nsb-hero-bubble">
                      <Text>Assign Design review to</Text>
                      <span className="nsb-mention">
                        <Avatar name="Sara" size={16} />
                        @Sara
                      </span>
                    </div>
                    <div className="nsb-hero-reply" data-on={s.on || undefined}>
                      <Text className="nsb-hero-reply-text">
                        Done — Sara has it on In Progress.
                      </Text>
                      <div className="nsb-hero-task">
                        <div className="nsb-hero-task-top">
                          <span className="nsb-status" data-on>
                            <Icon name="check" size={11} filled />
                            Assigned
                          </span>
                          <span className="nsb-hero-lane">In Progress</span>
                        </div>
                        <Text className="nsb-hero-card-title">Design review</Text>
                        <div className="nsb-hero-card-row">
                          <Avatar name="Sara" size={22} />
                          <div>
                            <Text className="nsb-hero-name">Sara Chen</Text>
                            <Text className="nsb-hero-stage">Launch Q2</Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="nsb-hero-board" aria-hidden data-on={s.on || undefined}>
                  <Text className="nsb-hero-board-label">Board</Text>
                  <div className="nsb-hero-board-card">
                    <Bar w="72%" h={7} r={3} tone={4} />
                    <div className="nsb-hero-card-row">
                      <Avatar name="Sara" size={18} />
                      <Bar w={48} h={5} r={3} tone={2} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Stage>
        </div>
      }
    />
  )
}

function ProgressStat() {
  const reduced = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(LEAD + STEP)
  return (
    <Tile area="stat">
      <div ref={ref} className="nsb-stat">
        <span className="nsb-stat-kicker">Live from the board</span>
        <span className="nsb-stat-number">
          <Count value={seen || reduced ? 68 : 18} duration={1000} />
          <span className="nsb-stat-unit">%</span>
        </span>
        <span className="nsb-stat-label">Project progress — averaged from every task stage.</span>
        <div className="nsb-stat-meter" aria-hidden>
          <Meter value={seen || reduced ? 0.68 : 0.18} />
        </div>
      </div>
    </Tile>
  )
}

function BoardTile() {
  const [picture, width] = usePictureWidth()
  return (
    <Tile
      area="board"
      lead="Kanban that updates itself"
      body="Move a card once. Progress and status stay honest."
      picture={
        <div ref={picture} className="nsb-picture nsb-picture--aligned">
          <Stage<Beat>
            width={width}
            height={176}
            initial={before}
            poster={after}
            play="once"
            script={beat(2)}
            accent="#2563eb"
            greys="cool"
            className="nsb-stage"
          >
            {(s) => (
              <div className="nsb-board">
                <div className="nsb-stages">
                  <span className="nsb-stage-chip" data-dim={s.on || undefined}>
                    Todo
                  </span>
                  <span className="nsb-stage-chip" data-active={s.on || undefined}>
                    In Progress
                  </span>
                </div>
                <div className="nsb-card" data-on={s.on || undefined}>
                  <Text className="nsb-card-title">Homepage polish</Text>
                  <div className="nsb-card-foot">
                    <div className="nsb-card-who">
                      <Avatar name="Alex" size={18} />
                      <Text className="nsb-card-name">Alex</Text>
                    </div>
                    <span
                      className={s.on ? 'nsb-status nsb-status--accent' : 'nsb-status'}
                      data-on={s.on || undefined}
                    >
                      {s.on ? 'Active' : 'Todo'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Stage>
        </div>
      }
    />
  )
}

function SpacesTile() {
  const [picture, width] = usePictureWidth()
  return (
    <Tile
      area="spaces"
      lead="Spaces, not chaos"
      body="One company. Clear rooms for product, design, and ops."
      picture={
        <div ref={picture} className="nsb-picture nsb-picture--aligned">
          <Stage<Beat>
            width={width}
            height={168}
            initial={before}
            poster={after}
            play="once"
            script={beat(3)}
            accent="#2563eb"
            greys="cool"
            className="nsb-stage"
          >
            {(s) => (
              <div className="nsb-spaces" data-on={s.on || undefined}>
                {[
                  { name: 'Product', people: 8, tone: 'a' },
                  { name: 'Design', people: 5, tone: 'b' },
                  { name: 'Launch', people: 4, tone: 'c' },
                ].map((space, i) => (
                  <div
                    key={space.name}
                    className="nsb-space"
                    data-tone={space.tone}
                    style={{ transitionDelay: `${i * 70}ms` }}
                  >
                    <span className="nsb-space-mark" />
                    <div className="nsb-space-copy">
                      <Text className="nsb-space-name">{space.name}</Text>
                      <Text className="nsb-space-meta">{`${space.people} members`}</Text>
                    </div>
                    <Bar w={36} h={6} r={3} tone={2} />
                  </div>
                ))}
              </div>
            )}
          </Stage>
        </div>
      }
    />
  )
}

function TeamTile() {
  const [picture, width] = usePictureWidth()
  return (
    <Tile
      area="team"
      lead="Invite the company"
      body="Owners send email invites. Members join the same tenancy."
      picture={
        <div ref={picture} className="nsb-picture nsb-picture--aligned">
          <Stage<Beat>
            width={width}
            height={168}
            initial={before}
            poster={after}
            play="once"
            script={beat(4)}
            accent="#2563eb"
            greys="cool"
            className="nsb-stage"
          >
            {(s) => (
              <div className="nsb-team">
                <div className="nsb-team-row">
                  <Avatar name="Maya" size={32} tone="accent" />
                  <div className="nsb-team-copy">
                    <Text className="nsb-team-name">maya@studio.co</Text>
                    <Text className="nsb-team-role">Member invite</Text>
                  </div>
                  <span className="nsb-status" data-on={s.on || undefined}>
                    {s.on ? (
                      <>
                        <Icon name="check" size={11} filled />
                        Joined
                      </>
                    ) : (
                      'Pending'
                    )}
                  </span>
                </div>
                <div className="nsb-team-faces" data-on={s.on || undefined}>
                  <Facepile names={['Sara', 'Alex', 'Jon', 'Maya']} size={24} />
                  <Text className="nsb-team-count">12 members</Text>
                </div>
              </div>
            )}
          </Stage>
        </div>
      }
    />
  )
}

export function NextSpaceBento() {
  return (
    <div className="ns-bento">
      <div className="nsb-grid">
        <HeroAssign />
        <ProgressStat />
        <BoardTile />
        <SpacesTile />
        <TeamTile />
      </div>
    </div>
  )
}
