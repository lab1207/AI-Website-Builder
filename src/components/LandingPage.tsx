import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
  starCount?: number;
}

const FEATURES = [
  {
    number: '01',
    icon: 'fa-solid fa-wand-magic-sparkles',
    title: 'Prompt to website',
    description:
      'Describe what you want in plain English. Get a complete, runnable site back — HTML, CSS, and JavaScript.',
  },
  {
    number: '02',
    icon: 'fa-solid fa-bolt',
    title: 'Live preview',
    description:
      'Watch it render as the code is written. Switch between desktop, tablet, and mobile in one click.',
  },
  {
    number: '03',
    icon: 'fa-solid fa-comments',
    title: 'Conversational editing',
    description:
      'Keep refining in the same thread. Every reply sees your current files and the viewport you are on.',
  },
  {
    number: '04',
    icon: 'fa-solid fa-location-crosshairs',
    title: 'Point and change',
    description:
      'Click a spot in the preview and tell the model exactly what should be different there.',
  },
  {
    number: '05',
    icon: 'fa-solid fa-shield-halved',
    title: 'Six providers',
    description:
      'Gemini, OpenAI, OpenRouter, NVIDIA NIM, Anthropic Claude, or any OpenAI-compatible endpoint.',
  },
  {
    number: '06',
    icon: 'fa-solid fa-code-branch',
    title: 'Frameworks',
    description:
      'Plain HTML and CSS, React, Vue, or Next.js. Exports ship the scaffold they need to run.',
  },
  {
    number: '07',
    icon: 'fa-solid fa-clock-rotate-left',
    title: 'Version history',
    description:
      'Every generation is snapshotted. Restore any earlier version with one click.',
  },
  {
    number: '08',
    icon: 'fa-solid fa-arrow-up-from-bracket',
    title: 'One-click publish',
    description:
      'Download a ZIP, push to GitHub, or deploy to Vercel — all from the same screen.',
  },
];

const STATS = [
  { value: '6', label: 'providers' },
  { value: '4', label: 'frameworks' },
  { value: '0', label: 'backends' },
  { value: '0', label: 'accounts' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, starCount }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top bar */}
      <header
        className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
          scrolled ? 'border-line bg-surface/80 backdrop-blur-md' : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2.5" aria-label="AI Website Builder">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-accent to-violet-500 text-white shadow-[var(--shadow-md)]">
              <i className="fa-solid fa-bolt text-[15px]" aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              AI Website Builder
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-[13.5px] text-ink-muted md:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#providers" className="transition-colors hover:text-ink">
              Providers
            </a>
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a
              href="https://github.com/lab1207/AI-Website-Builder"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink"
            >
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/lab1207/AI-Website-Builder"
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-md btn-secondary hidden sm:inline-flex"
            >
              <i className="fa-brands fa-github text-[14px]" aria-hidden="true" />
              {typeof starCount === 'number' ? `★ ${starCount}` : 'Star'}
            </a>
            <button onClick={onEnter} className="btn btn-md btn-primary">
              Start building
              <i className="fa-solid fa-arrow-right text-[11px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)',
          }}
        />
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink-muted shadow-[var(--shadow-sm)]">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              Open source · runs entirely in your browser
            </span>
            <h1 className="mt-7 text-[44px] font-bold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[60px] md:text-[72px]">
              Describe a website.
              <br />
              <span className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">
                Get the code.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-[640px] text-[17px] leading-relaxed text-ink-muted sm:text-[19px]">
              Write a sentence, get a complete site back — HTML, CSS, and
              JavaScript, or React, Vue, and Next.js. Live preview, conversational
              editing, version history, one-click publish. No account, no backend.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={onEnter} className="btn btn-lg btn-primary">
                <i className="fa-solid fa-bolt text-[13px]" aria-hidden="true" />
                Start building — it's free
              </button>
              <a
                href="https://github.com/lab1207/AI-Website-Builder"
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-lg btn-secondary"
              >
                <i className="fa-brands fa-github text-[15px]" aria-hidden="true" />
                View on GitHub
              </a>
            </div>
            <p className="mt-5 text-[12.5px] text-ink-faint">
              Bring your own key from Gemini, OpenAI, OpenRouter, NVIDIA, or
              Claude. Your key stays in your browser.
            </p>
          </div>

          {/* Hero preview mock */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-lg)]">
              <div className="rounded-xl border border-line bg-canvas overflow-hidden">
                <div className="flex h-9 items-center gap-2 border-b border-line bg-surface-2 px-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="ml-3 flex-1 rounded-md bg-surface-3 px-3 py-1 text-[10.5px] text-ink-faint">
                    localhost:3000
                  </div>
                </div>
                <div className="grid grid-cols-[260px_1fr] h-[360px]">
                  <div className="border-r border-line bg-surface-2 p-3 space-y-2">
                    <div className="h-7 rounded-lg bg-accent-soft" />
                    <div className="h-14 rounded-lg bg-surface" />
                    <div className="h-14 rounded-lg bg-surface" />
                    <div className="mt-4 h-20 rounded-xl bg-surface border border-line" />
                  </div>
                  <div className="bg-canvas p-6">
                    <div className="h-6 w-40 rounded bg-surface-3" />
                    <div className="mt-3 h-3 w-72 rounded bg-surface-3" />
                    <div className="mt-1.5 h-3 w-56 rounded bg-surface-3" />
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-xl bg-surface border border-line" />
                      <div className="h-20 rounded-xl bg-surface border border-line" />
                      <div className="h-20 rounded-xl bg-surface border border-line" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-12 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[40px] font-bold tracking-[-0.03em] text-ink">
                {stat.value}
              </div>
              <div className="mt-1 text-[12.5px] uppercase tracking-[0.12em] text-ink-faint">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent">
            Features
          </p>
          <h2 className="mt-3 text-[34px] font-bold tracking-[-0.02em] text-ink sm:text-[44px]">
            Everything you need to ship a site.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
            From prompt to production, without leaving the browser.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <article
              key={feature.number}
              className="group rounded-2xl border border-line bg-surface p-6 transition-all hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-ink-faint">
                  {feature.number}
                </span>
                <i
                  className={`${feature.icon} text-[16px] text-ink-faint transition-colors group-hover:text-accent`}
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Providers */}
      <section id="providers" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent">
              Providers
            </p>
            <h2 className="mt-3 text-[34px] font-bold tracking-[-0.02em] text-ink sm:text-[44px]">
              Bring your own key.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
              Six providers out of the box, plus any endpoint that speaks the
              OpenAI protocol. Keys stay in your browser.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { name: 'Google Gemini', prefix: 'AIza…' },
              { name: 'OpenAI', prefix: 'sk-…' },
              { name: 'OpenRouter', prefix: 'sk-or-…' },
              { name: 'NVIDIA NIM', prefix: 'nvapi-…' },
              { name: 'Anthropic', prefix: 'sk-ant-…' },
              { name: 'Custom', prefix: 'any URL' },
            ].map((provider) => (
              <div
                key={provider.name}
                className="rounded-xl border border-line bg-canvas px-4 py-5 text-center transition-colors hover:border-line-strong"
              >
                <div className="text-[13px] font-semibold text-ink">
                  {provider.name}
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-ink-faint">
                  {provider.prefix}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent">
            How it works
          </p>
          <h2 className="mt-3 text-[34px] font-bold tracking-[-0.02em] text-ink sm:text-[44px]">
            Three steps.
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Pick a provider',
              description:
                'Choose Gemini, OpenAI, OpenRouter, NVIDIA, Claude, or a custom endpoint. Paste your key.',
            },
            {
              step: '02',
              title: 'Describe your site',
              description:
                'In plain English, with or without a reference image. Be as vague or as specific as you like.',
            },
            {
              step: '03',
              title: 'Ship it',
              description:
                'Preview, refine, and publish — download a ZIP, push to GitHub, or deploy to Vercel.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-line bg-surface p-8 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
            >
              <div className="text-[12px] font-mono text-accent">{item.step}</div>
              <h3 className="mt-3 text-[19px] font-semibold text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-[34px] font-bold tracking-[-0.02em] text-ink sm:text-[48px]">
            Ready to build?
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
            No sign-up. No waitlist. Open the builder and start typing.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={onEnter} className="btn btn-lg btn-primary">
              <i className="fa-solid fa-bolt text-[13px]" aria-hidden="true" />
              Open the builder
            </button>
            <a
              href="https://github.com/lab1207/AI-Website-Builder"
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-lg btn-secondary"
            >
              <i className="fa-brands fa-github text-[15px]" aria-hidden="true" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-[12.5px] text-ink-faint sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-white">
              <i className="fa-solid fa-bolt text-[11px]" aria-hidden="true" />
            </span>
            <span>AI Website Builder</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/lab1207/AI-Website-Builder"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink"
            >
              GitHub
            </a>
            <a
              href="https://lab1207.github.io/AI-Website-Builder/"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink"
            >
              Live demo
            </a>
            <span>GPL-3.0-or-later</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
