"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type AgentConfig = {
  personality: string;
  context: string[];
};

export default function AgentPage() {
  const [data, setData] = useState<AgentConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [newContext, setNewContext] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/config/agent');
      const json = await res.json();
      setData(json);
    })();
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    await fetch('/api/config/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
  }

  if (!data) return <div className="p-8">Loading…</div>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Personality</Label>
            <Textarea
              value={data.personality}
              onChange={(e) => setData({ ...data, personality: e.target.value })}
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <Label>Context</Label>
            <div className="space-y-2">
              {data.context?.map((c, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={c}
                    onChange={(e) => {
                      const next = [...data.context];
                      next[idx] = e.target.value;
                      setData({ ...data, context: next });
                    }}
                  />
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const next = data.context.filter((_, i) => i !== idx);
                      setData({ ...data, context: next });
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
                  onClick={() => {
                    if (!newContext.trim()) return;
                    const next = [...(data.context || []), newContext.trim()];
                    setData({ ...data, context: next });
                    setNewContext('');
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}


