import {
  Avatar,
  Bar,
  Collapse,
  Field,
  Icon,
  Stage,
  Stream,
  Text,
  Window,
  type Act,
} from './kit'
import './NextSpaceAiHero.css'

// Workspace AI demo. Closest gold: overlap + ai-chat + bento hero.
// Side-by-side: board left, AI chat right. Story: ask → assign → board updates.

const Q = 'Assign Design review to @Sara'
const A = 'Done — Sara has Design review on In Progress.'
const WORDS = A.split(' ').length

type S = {
  draft: string
  sent: boolean
  phase: 'idle' | 'thinking' | 'answer'
  words: number
  moved: boolean
}

const initial: S = {
  draft: '',
  sent: false,
  phase: 'idle',
  words: 0,
  moved: false,
}

const poster: S = {
  draft: '',
  sent: true,
  phase: 'answer',
  words: WORDS,
  moved: true,
}

async function script(a: Act<S>) {
  await a.wait(550)
  a.mark('type')
  await a.type('draft', Q, { interval: 30 })
  await a.wait(280)
  a.mark('send')
  a.put({ sent: true, draft: '' })
  await a.wait(320)
  a.put({ phase: 'thinking' })
  await a.wait(680)
  a.mark('stream')
  a.put({ phase: 'answer' })
  for (let i = 1; i <= WORDS; i++) {
    a.put({ words: i })
    await a.wait(32)
  }
  await a.wait(180)
  a.mark('board')
  a.put({ moved: true })
  await a.wait(2400)
  await a.snap(initial)
  await a.wait(380)
}

function BoardCols({ moved }: { moved: boolean }) {
  return (
    <div className="ns-ai-board">
      <div className="ns-ai-col">
        <div className="ns-ai-col-head">
          <Text className="ns-ai-col-label">Todo</Text>
          <span className="ns-ai-count">{moved ? '1' : '2'}</span>
        </div>
        <div className="ns-ai-task" data-ghost={moved || undefined}>
          <Text className="ns-ai-task-title">Design review</Text>
          <div className="ns-ai-task-meta">
            <Bar w={48} h={6} r={3} tone={2} />
          </div>
        </div>
        <div className="ns-ai-task ns-ai-task--quiet">
          <Bar w="70%" h={7} r={3} tone={3} />
          <Bar w="42%" h={6} r={3} tone={2} />
        </div>
      </div>

      <div className="ns-ai-col" data-focus>
        <div className="ns-ai-col-head">
          <Text className="ns-ai-col-label">In Progress</Text>
          <span className="ns-ai-count">{moved ? '2' : '1'}</span>
        </div>
        <div className="ns-ai-task ns-ai-task--live" data-on={moved || undefined}>
          {moved ? (
            <>
              <div className="ns-ai-task-top">
                <Text className="ns-ai-task-title">Design review</Text>
                <span className="ns-ai-pill">AI</span>
              </div>
              <div className="ns-ai-task-meta">
                <Avatar name="Sara" size={20} />
                <Text className="ns-ai-who">Sara</Text>
              </div>
            </>
          ) : (
            <>
              <Bar w="64%" h={7} r={3} tone={3} />
              <div className="ns-ai-task-meta">
                <Bar w={20} h={20} r={10} tone={2} />
                <Bar w={44} h={6} r={3} tone={2} />
              </div>
            </>
          )}
        </div>
        <div className="ns-ai-task ns-ai-task--quiet">
          <Bar w="58%" h={7} r={3} tone={3} />
          <div className="ns-ai-task-meta">
            <Bar w={20} h={20} r={10} tone={2} />
            <Bar w={40} h={6} r={3} tone={2} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function NextSpaceAiHero() {
  return (
    <Stage
      width={720}
      height={400}
      compact={{ below: 680, width: 358, height: 560 }}
      initial={initial}
      poster={poster}
      script={script}
      play="loop"
      theme="light"
      palette="accent"
      fidelity="standard"
      greys="cool"
      accent="#2563eb"
      fill
      className="ns-ai"
      cursor={{ at: { x: 540, y: 320 }, style: 'large', idle: 2200 }}
    >
      {(s) => (
        <>
          <Window title="yally ai · Board" className="ns-ai-win">
            <div className="ns-ai-app">
              <header className="ns-ai-appbar">
                <div>
                  <Text className="ns-ai-project">Launch Q2</Text>
                  <Text className="ns-ai-proj-sub">Project board</Text>
                </div>
                <div className="ns-ai-faces" aria-hidden>
                  <Avatar name="Sara" size={22} />
                  <Avatar name="Alex" size={22} />
                  <Avatar name="Maya" size={22} />
                </div>
              </header>
              <BoardCols moved={s.moved} />
            </div>
          </Window>

          <section className="ns-ai-panel" aria-hidden>
            <div className="ns-ai-panel-top">
              <div className="ns-ai-panel-brand">
                <span className="ns-ai-panel-mark" aria-hidden />
                <Text className="ns-ai-panel-title">NextSpace AI</Text>
              </div>
              <span className="ns-ai-live">Live</span>
            </div>

            <div className="ns-ai-thread">
              <div className="ns-ai-past" aria-hidden>
                <Bar w={112} h={22} r={11} tone={1} className="ns-ai-past-q" />
                <Bar w="90%" h={6} r={3} tone={2} />
                <Bar w="68%" h={6} r={3} tone={2} />
              </div>

              <Collapse open={s.sent} reveal="drop" from="below">
                <div className="ns-ai-q">
                  <Text>{Q}</Text>
                </div>
              </Collapse>

              <Collapse open={s.phase === 'thinking'}>
                <Text className="ns-ai-thinking">Thinking</Text>
              </Collapse>

              <Collapse open={s.phase === 'answer'}>
                <div className="ns-ai-a" data-on>
                  <Stream className="ns-ai-stream" text={A} count={s.words} />
                  <div className="ns-ai-result" data-on={s.moved || undefined}>
                    <div className="ns-ai-result-top">
                      <span className="ns-ai-status">
                        <Icon name="check" size={11} filled />
                        Assigned
                      </span>
                      <span className="ns-ai-lane">In Progress</span>
                    </div>
                    <Text className="ns-ai-result-title">Design review</Text>
                    <div className="ns-ai-result-row">
                      <Avatar name="Sara" size={22} />
                      <div>
                        <Text className="ns-ai-result-name">Sara Chen</Text>
                        <Text className="ns-ai-result-sub">Launch Q2</Text>
                      </div>
                    </div>
                  </div>
                </div>
              </Collapse>
            </div>

            <Field
              className="ns-ai-composer"
              value={s.draft}
              placeholder="Ask NextSpace AI…"
              focused={!s.sent}
              box={{ 'data-target': 'composer' }}
            />
          </section>
        </>
      )}
    </Stage>
  )
}
