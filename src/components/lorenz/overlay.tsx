import { useEffect } from "react";
import {
  Info,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PRESETS } from "@/lib/lorenz/presets";
import { useLorenz, type ColorMode } from "@/lib/lorenz/store";
import { cn } from "@/lib/utils";

const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "height", label: "Высота" },
  { id: "speed", label: "Скорость" },
  { id: "age", label: "Возраст" },
];

function fmt(n: number, d = 2): string {
  return n.toFixed(d);
}

function ParamRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs tracking-wide text-muted">{label}</span>
        <span className="font-mono text-xs tabular-nums text-fg">
          {fmt(value, step < 0.1 ? 2 : step < 1 ? 1 : 0)}
        </span>
      </span>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v ?? min)} />
    </label>
  );
}

function Controls({ className }: { className?: string }) {
  const sigma = useLorenz((s) => s.sigma);
  const rho = useLorenz((s) => s.rho);
  const beta = useLorenz((s) => s.beta);
  const speed = useLorenz((s) => s.speed);
  const particles = useLorenz((s) => s.particles);
  const trail = useLorenz((s) => s.trail);
  const colorMode = useLorenz((s) => s.colorMode);
  const presetId = useLorenz((s) => s.presetId);
  const autoRotate = useLorenz((s) => s.autoRotate);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div>
        <p className="mb-2 font-mono text-[11px] tracking-[0.16em] text-subtle uppercase">Пресеты</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.blurb}
              onClick={() => useLorenz.getState().applyPreset(p.id)}
              className={cn(
                "h-9 rounded-[var(--radius-sm)] px-3 text-sm transition-[background-color,color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
                presetId === p.id
                  ? "bg-fg text-bg"
                  : "bg-transparent text-muted shadow-[var(--shadow-border)] hover:text-fg hover:shadow-[var(--shadow-border-hover)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <ParamRow label="σ  Прандтль" value={sigma} min={1} max={30} step={0.1} onChange={useLorenz.getState().setSigma} />
        <ParamRow label="ρ  Рэлей" value={rho} min={0.5} max={120} step={0.1} onChange={useLorenz.getState().setRho} />
        <ParamRow label="β  геометрия" value={beta} min={0.2} max={8} step={0.01} onChange={useLorenz.getState().setBeta} />
        <ParamRow label="Интеграция" value={speed} min={0.15} max={3} step={0.05} onChange={useLorenz.getState().setSpeed} />
        <ParamRow
          label="Траектории"
          value={particles}
          min={1}
          max={48}
          step={1}
          onChange={(v) => useLorenz.getState().setParticles(Math.round(v))}
        />
        <ParamRow
          label="Длина следа"
          value={trail}
          min={400}
          max={8000}
          step={100}
          onChange={(v) => useLorenz.getState().setTrail(Math.round(v))}
        />
      </div>

      <div>
        <p className="mb-2 font-mono text-[11px] tracking-[0.16em] text-subtle uppercase">Цвет</p>
        <div className="flex gap-1.5">
          {COLOR_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => useLorenz.getState().setColorMode(m.id)}
              className={cn(
                "h-9 flex-1 rounded-[var(--radius-sm)] px-2 text-sm transition-[background-color,color] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
                colorMode === m.id ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-2 px-3">
        <span className="text-sm text-fg">Автоповорот</span>
        <input
          type="checkbox"
          className="size-4 accent-fg"
          checked={autoRotate}
          onChange={(e) => useLorenz.getState().setAutoRotate(e.target.checked)}
        />
      </label>
    </div>
  );
}

export function Overlay() {
  const paused = useLorenz((s) => s.paused);
  const panelOpen = useLorenz((s) => s.panelOpen);
  const aboutOpen = useLorenz((s) => s.aboutOpen);
  const leadX = useLorenz((s) => s.leadX);
  const leadY = useLorenz((s) => s.leadY);
  const leadZ = useLorenz((s) => s.leadZ);
  const simTime = useLorenz((s) => s.simTime);
  const sigma = useLorenz((s) => s.sigma);
  const rho = useLorenz((s) => s.rho);
  const beta = useLorenz((s) => s.beta);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      useLorenz.getState().setAutoRotate(false);
    }

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        useLorenz.getState().togglePaused();
      } else if (e.key === "r" || e.key === "R") {
        useLorenz.getState().reset();
      } else if (e.key === "p" || e.key === "P") {
        useLorenz.getState().perturb();
      } else if (e.key >= "1" && e.key <= "5") {
        const preset = PRESETS[Number(e.key) - 1];
        if (preset) useLorenz.getState().applyPreset(preset.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      <header className="pointer-events-none absolute top-0 right-0 left-0 flex items-start justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6 lg:right-[22.5rem]">
        <div className="pointer-events-auto max-w-[min(100%,22rem)]">
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted uppercase">
            Динамическая система · 1963
          </p>
          <h1 className="font-display mt-1 text-[2.15rem] leading-[1.05] tracking-[-0.03em] text-balance sm:text-[2.75rem]">
            Аттрактор Лоренца
          </h1>
          <p className="mt-2 max-w-[18rem] text-sm leading-snug text-muted text-pretty">
            Хаотический поток в трёхмерном фазовом пространстве. Малое возмущение расходится.
          </p>
          <div className="mt-4 hidden font-mono text-[12px] leading-relaxed text-subtle sm:block">
            <p>ẋ = σ (y − x)</p>
            <p>ẏ = x (ρ − z) − y</p>
            <p>ẓ = xy − βz</p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <Button
            variant="quiet"
            size="icon"
            aria-label={paused ? "Продолжить" : "Пауза"}
            onClick={() => useLorenz.getState().togglePaused()}
          >
            <span className="relative size-4">
              <Pause
                className={cn(
                  "absolute inset-0 size-4 transition-[opacity,transform,filter] duration-[var(--motion-fast)] ease-[var(--ease-in-out)]",
                  paused ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none",
                )}
              />
              <Play
                className={cn(
                  "absolute inset-0 size-4 ml-px transition-[opacity,transform,filter] duration-[var(--motion-fast)] ease-[var(--ease-in-out)]",
                  paused ? "scale-100 opacity-100 blur-none" : "scale-[0.25] opacity-0 blur-[4px]",
                )}
                fill="currentColor"
              />
            </span>
          </Button>
          <Button variant="quiet" size="icon" aria-label="Сброс" onClick={() => useLorenz.getState().reset()}>
            <RotateCcw className="size-4" />
          </Button>
          <Button
            variant="quiet"
            size="icon"
            aria-label="Возмущение"
            title="Возмущение начальных условий"
            onClick={() => useLorenz.getState().perturb()}
          >
            <Shuffle className="size-4" />
          </Button>
          <Button
            variant="quiet"
            size="icon"
            aria-label="О системе"
            aria-pressed={aboutOpen}
            onClick={() => useLorenz.getState().setAboutOpen(!aboutOpen)}
          >
            <Info className="size-4" />
          </Button>
          <Button
            variant="quiet"
            size="icon"
            className="lg:hidden"
            aria-label="Параметры"
            aria-pressed={panelOpen}
            onClick={() => useLorenz.getState().setPanelOpen(!panelOpen)}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </header>

      <aside className="pointer-events-auto absolute top-6 right-6 bottom-6 hidden w-[20.5rem] overflow-y-auto rounded-[var(--radius-xl)] bg-surface p-4 shadow-[var(--shadow-border)] lg:block">
        <p className="mb-4 font-mono text-[11px] tracking-[0.16em] text-subtle uppercase">Параметры</p>
        <Controls />
      </aside>

      {panelOpen ? (
        <div className="pointer-events-auto absolute inset-0 z-20 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-bg/55"
            aria-label="Закрыть параметры"
            onClick={() => useLorenz.getState().setPanelOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[78%] overflow-y-auto rounded-t-[var(--radius-xl)] bg-surface p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-border)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[11px] tracking-[0.16em] text-subtle uppercase">Параметры</p>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Закрыть"
                onClick={() => useLorenz.getState().setPanelOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Controls />
          </div>
        </div>
      ) : null}

      {aboutOpen ? (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-bg/60"
            aria-label="Закрыть справку"
            onClick={() => useLorenz.getState().setAboutOpen(false)}
          />
          <article className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-border)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl tracking-[-0.02em]">О системе</h2>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Закрыть"
                onClick={() => useLorenz.getState().setAboutOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-muted text-pretty">
              <p>
                В 1963 году Эдвард Лоренц свёл модель конвекции атмосферы к трём обыкновенным дифференциальным уравнениям.
                При классических коэффициентах σ = 10, ρ = 28, β = 8/3 траектории не сходятся к точке и не уходят на бесконечность — они наматываются на странный аттрактор.
              </p>
              <p>
                Две «крыла» бабочки — окрестности неустойчивых фокусов. Система чувствительна к начальным данным: расхождение траекторий экспоненциально. Это и есть эффект бабочки.
              </p>
              <p className="font-mono text-xs text-subtle">
                Пробел — пауза · R — сброс · P — возмущение · 1–5 — пресеты
              </p>
            </div>
          </article>
        </div>
      ) : null}

      <footer className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-between gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:right-[22.5rem]">
        <div className="rounded-[var(--radius-lg)] bg-surface/90 px-3 py-2 shadow-[var(--shadow-border)]">
          <p className="font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">Фаза</p>
          <p className="font-mono text-xs tabular-nums text-fg">
            x {fmt(leadX, 3)}
            <span className="text-subtle"> · </span>
            y {fmt(leadY, 3)}
            <span className="text-subtle"> · </span>
            z {fmt(leadZ, 3)}
          </p>
        </div>
        <div className="hidden rounded-[var(--radius-lg)] bg-surface/90 px-3 py-2 shadow-[var(--shadow-border)] sm:block">
          <p className="font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">σ ρ β · t</p>
          <p className="font-mono text-xs tabular-nums text-fg">
            {fmt(sigma, 2)} · {fmt(rho, 2)} · {fmt(beta, 3)}
            <span className="text-subtle"> · </span>
            {fmt(simTime, 1)}
          </p>
        </div>
        <p className="hidden font-mono text-[11px] text-subtle md:block">
          Перетащите, чтобы вращать · колесо — масштаб
        </p>
      </footer>
    </div>
  );
}
