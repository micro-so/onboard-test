"use client";
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

type AgentConfig = {
  personality: string;
  context: string[];
};

type Datapoint = {
  name: string;
  format: string;
  instructions: string;
  options?: string[];
};

type Section = {
  section: string;
  datapoints: Datapoint[];
};

type OnboardingConfig = {
  sections: Section[];
};

export default function Home() {
  // Agent state
  const [agent, setAgent] = useState<AgentConfig | null>(null)
  const [agentSaving, setAgentSaving] = useState(false)
  const [newContext, setNewContext] = useState('')
  // Onboarding state
  const [onboarding, setOnboarding] = useState<OnboardingConfig | null>(null)
  const [onboardingSaving, setOnboardingSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [a, o] = await Promise.all([
        fetch('/api/config/agent').then((r) => r.json()),
        fetch('/api/config/onboarding').then((r) => r.json()),
      ])
      setAgent(a)
      setOnboarding(o)
    })()
  }, [])

  async function saveAgent() {
    if (!agent) return
    setAgentSaving(true)
    await fetch('/api/config/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    })
    setAgentSaving(false)
    toast('Agent config saved')
  }

  async function saveOnboarding() {
    if (!onboarding) return
    setOnboardingSaving(true)
    await fetch('/api/config/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(onboarding),
    })
    setOnboardingSaving(false)
    toast('Onboarding config saved')
  }

  if (!agent || !onboarding) return <main className="p-8">Loading…</main>

  return (
    <main className="mx-auto max-w-4xl p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Config Editor</h1>
      <Separator />

      {/* Agent Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Personality</Label>
            <Textarea
              value={agent.personality}
              onChange={(e) => setAgent({ ...agent, personality: e.target.value })}
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <Label>Context</Label>
            <div className="space-y-2">
              {agent.context?.map((c, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={c}
                    onChange={(e) => {
                      const next = [...agent.context]
                      next[idx] = e.target.value
                      setAgent({ ...agent, context: next })
                    }}
                  />
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const next = agent.context.filter((_, i) => i !== idx)
                      setAgent({ ...agent, context: next })
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add context item"
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!newContext.trim()) return
                    const next = [...(agent.context || []), newContext.trim()]
                    setAgent({ ...agent, context: next })
                    setNewContext('')
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Button onClick={saveAgent} disabled={agentSaving}>
              {agentSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {onboarding.sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Section name</Label>
                  <Input
                    value={sec.section}
                    onChange={(e) => {
                      const next = structuredClone(onboarding)
                      next.sections[sIdx].section = e.target.value
                      setOnboarding(next)
                    }}
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const next = structuredClone(onboarding)
                    next.sections.splice(sIdx, 1)
                    setOnboarding(next)
                  }}
                >
                  Remove
                </Button>
              </div>

              <div className="space-y-4">
                {sec.datapoints.map((dp, dIdx) => (
                  <div key={dIdx} className="border rounded p-4 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={dp.name}
                          onChange={(e) => {
                            const next = structuredClone(onboarding)
                            next.sections[sIdx].datapoints[dIdx].name = e.target.value
                            setOnboarding(next)
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Input
                          value={dp.format}
                          onChange={(e) => {
                            const next = structuredClone(onboarding)
                            next.sections[sIdx].datapoints[dIdx].format = e.target.value
                            setOnboarding(next)
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Instructions</Label>
                      <Textarea
                        rows={3}
                        value={dp.instructions}
                        onChange={(e) => {
                          const next = structuredClone(onboarding)
                          next.sections[sIdx].datapoints[dIdx].instructions = e.target.value
                          setOnboarding(next)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Options (comma separated)</Label>
                      <Input
                        value={(dp.options || []).join(', ')}
                        onChange={(e) => {
                          const next = structuredClone(onboarding)
                          next.sections[sIdx].datapoints[dIdx].options = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                          setOnboarding(next)
                        }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const next = structuredClone(onboarding)
                          next.sections[sIdx].datapoints.splice(dIdx, 1)
                          setOnboarding(next)
                        }}
                      >
                        Remove datapoint
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    const next = structuredClone(onboarding)
                    next.sections[sIdx].datapoints.push({
                      name: '',
                      format: 'string',
                      instructions: '',
                      options: [],
                    })
                    setOnboarding(next)
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Datapoint
                </Button>
              </div>

              <Separator />
            </div>
          ))}

          <Button
            onClick={() => {
              const next = structuredClone(onboarding)
              next.sections.push({ section: 'New Section', datapoints: [] })
              setOnboarding(next)
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Section
          </Button>

          <div>
            <Button onClick={saveOnboarding} disabled={onboardingSaving}>
              {onboardingSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
