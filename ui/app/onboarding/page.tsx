"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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

export default function OnboardingPage() {
  const [data, setData] = useState<OnboardingConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/config/onboarding');
      const json = await res.json();
      setData(json);
    })();
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    await fetch('/api/config/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
  }

  if (!data) return <div className="p-8">Loading…</div>;

  return (
    <main className="mx-auto max-w-4xl p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {data.sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Section name</Label>
                  <Input
                    value={sec.section}
                    onChange={(e) => {
                      const next = structuredClone(data);
                      next.sections[sIdx].section = e.target.value;
                      setData(next);
                    }}
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const next = structuredClone(data);
                    next.sections.splice(sIdx, 1);
                    setData(next);
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
                            const next = structuredClone(data);
                            next.sections[sIdx].datapoints[dIdx].name = e.target.value;
                            setData(next);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Input
                          value={dp.format}
                          onChange={(e) => {
                            const next = structuredClone(data);
                            next.sections[sIdx].datapoints[dIdx].format = e.target.value;
                            setData(next);
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
                          const next = structuredClone(data);
                          next.sections[sIdx].datapoints[dIdx].instructions = e.target.value;
                          setData(next);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Options (comma separated)</Label>
                      <Input
                        value={(dp.options || []).join(', ')}
                        onChange={(e) => {
                          const next = structuredClone(data);
                          next.sections[sIdx].datapoints[dIdx].options = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setData(next);
                        }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const next = structuredClone(data);
                          next.sections[sIdx].datapoints.splice(dIdx, 1);
                          setData(next);
                        }}
                      >
                        Remove datapoint
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    const next = structuredClone(data);
                    next.sections[sIdx].datapoints.push({
                      name: '',
                      format: 'string',
                      instructions: '',
                      options: [],
                    });
                    setData(next);
                  }}
                >
                  Add datapoint
                </Button>
              </div>

              <Separator />
            </div>
          ))}

          <Button
            onClick={() => {
              const next = structuredClone(data);
              next.sections.push({ section: 'New Section', datapoints: [] });
              setData(next);
            }}
          >
            Add section
          </Button>

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


