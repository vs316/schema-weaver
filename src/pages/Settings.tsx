import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette } from "lucide-react";
import { AppShell } from "../components/shell/AppShell";
import { useAppearance } from "../components/AppearanceProvider";
import { Card } from "../ui/Surface";
import { Button } from "../ui/Button";
import { SegmentedControl, Switch } from "../ui/SegmentedControl";
import {
  DENSITY_OPTIONS,
  FONT_OPTIONS,
  SCALE_OPTIONS,
  THEME_OPTIONS,
} from "../design/appearance";

function Row({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="sm:min-w-[280px]">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { appearance, update, reset } = useAppearance();

  return (
    <AppShell
      header={
        <div className="flex w-full items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/diagrams")} aria-label="Back">
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-sm font-semibold">Personal settings</h1>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl px-6 py-8 animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Palette size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Appearance</h2>
            <p className="text-xs text-muted-foreground">
              These preferences are saved to your account and follow you across devices.
            </p>
          </div>
        </div>

        <Card className="px-5 py-1">
          <Row title="Theme" description="Charcoal &amp; Ember, light, or maximum contrast">
            <SegmentedControl
              fullWidth
              value={appearance.theme}
              onChange={(v) => update({ theme: v })}
              options={THEME_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.hint }))}
            />
          </Row>

          <Row title="Font" description="Applies to the whole workspace, including the canvas UI">
            <SegmentedControl
              fullWidth
              value={appearance.font}
              onChange={(v) => update({ font: v })}
              options={FONT_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.sample }))}
            />
          </Row>

          <Row title="Text size" description="Scales every control and label proportionally">
            <SegmentedControl
              fullWidth
              value={appearance.scale}
              onChange={(v) => update({ scale: v })}
              options={SCALE_OPTIONS}
            />
          </Row>

          <Row title="Density" description="How much breathing room lists, panels and toolbars get">
            <SegmentedControl
              fullWidth
              value={appearance.density}
              onChange={(v) => update({ density: v })}
              options={DENSITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.hint }))}
            />
          </Row>

          <Row title="Reduce motion" description="Turn off transitions and animated flourishes">
            <div className="flex justify-end">
              <Switch checked={appearance.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
            </div>
          </Row>
        </Card>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4">
          <div>
            <p className="text-sm font-medium">Reset appearance</p>
            <p className="text-xs text-muted-foreground">Restore the default dark, cozy, sans setup.</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
          <div className="space-y-3">
            <h3 className="text-xl font-bold tracking-tight">The quick brown fox jumps over the lazy dog</h3>
            <p className="text-sm text-muted-foreground">
              Body copy renders in your chosen family and size. Controls below use your density setting.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm">Primary</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="outline" size="sm">Outline</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
