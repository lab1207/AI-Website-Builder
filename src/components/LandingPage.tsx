import React, { useEffect, useRef, useState } from 'react';
import Icon, { type IconName } from './Icon';
import Logo from './Logo';
import ProviderMark from './ProviderMark';
import { PROVIDERS } from '../lib/providers';

interface LandingPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onEnter: () => void;
  /** True when this browser already has a project or has opened the studio. */
  returning: boolean;
}

const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-up ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const featureCards = [
  {
    icon: 'monitor' as const,
    title: 'A live sandbox, not a slideshow',
    body: 'Every generation renders in an isolated iframe as it streams. Click links, submit the form, resize to phone width. The preview is the site.',
  },
  {
    icon: 'cursor' as const,
    title: 'Point at what should change',
    body: 'Turn on point-and-edit, click the hero, and say “warmer and quieter”. The coordinates travel with your prompt, so the model knows exactly what you meant.',
  },
  {
    icon: 'diff' as const,
    title: 'Version history with real diffs',
    body: 'Each build is snapshotted. Compare it line by line with the current project, then restore any version without losing the conversation.',
  },
  {
    icon: 'files' as const,
    title: 'One site, many pages',
    body: 'Ask for an about page, a services page, a contact page. Shared styles and scripts, working navigation, and page tabs in the preview.',
  },
  {
    icon: 'layers' as const,
    title: 'Frameworks without the setup',
    body: 'Ship HTML, React, Vue, or Next.js. Framework projects include a live static preview in the browser, plus a runnable scaffold when you export.',
  },
  {
    icon: 'globe' as const,
    title: 'Publish and point a domain',
    body: 'Download a ZIP, push to GitHub, or deploy to Vercel. Add a custom domain with generated DNS records and a CNAME that travels with the project.',
  },
];

const projectTypes = [
  {
    icon: 'code' as const,
    label: 'HTML, CSS & JS',
    files: ['index.html', 'styles.css', 'script.js'],
    body: 'A dependency-free static site. Add as many pages as the idea needs.',
  },
  {
    icon: 'layers' as const,
    label: 'React',
    files: ['src/App.jsx', 'vite.config.js', 'package.json'],
    body: 'Vite + React with function components, hooks, and a live preview.',
  },
  {
    icon: 'package' as const,
    label: 'Vue 3',
    files: ['src/App.vue', 'src/main.js', 'vite.config.js'],
    body: 'Single-file components with script setup and a ready Vite project.',
  },
  {
    icon: 'zap' as const,
    label: 'Next.js',
    files: ['app/page.jsx', 'app/layout.jsx', 'next.config.mjs'],
    body: 'The App Router, ready for Vercel, with a static browser preview.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Describe the site',
    body: 'A sentence is enough. Choose a provider, pick a model, and paste a screenshot if you have one.',
  },
  {
    number: '02',
    title: 'Shape it in the open',
    body: 'Watch the code and the preview update together. Point, prompt, compare versions, auto-fix what looks off.',
  },
  {
    number: '03',
    title: 'Ship it for real',
    body: 'Download every file, push to GitHub, deploy to Vercel, and connect the domain you already own.',
  },
];

const faqs = [
  {
    question: 'Is it really free?',
    answer:
      'The builder is open source under GPL-3.0 and runs entirely in your browser. You bring your own model key, so you pay your provider directly — often nothing, because Gemini, OpenRouter, and NVIDIA all have free tiers.',
  },
  {
    question: 'Where does my API key go?',
    answer:
      'Into this browser’s localStorage, one key per provider. Requests go straight from your tab to the provider you picked. There is no backend of ours to send it to, and a test in CI fails the build if a key is ever committed to the repository.',
  },
  {
    question: 'Can it build more than a static page?',
    answer:
      'Yes. Multi-page static sites, React and Vue applications, and Next.js projects with a runnable scaffold. Framework projects also get a self-contained preview.html so you can see the design without running a local build.',
  },
  {
    question: 'What about custom domains?',
    answer:
      'Add the domain in the Publish panel and the builder generates a CNAME and the exact DNS records for GitHub Pages, Vercel, Netlify, or Cloudflare Pages. GitHub publishing also enables Pages when your token allows it.',
  },
];

const LandingPage: React.FC<LandingPageProps> = ({
  theme,
  onToggleTheme,
  onEnter,
  returning,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-page min-h-screen overflow-x-clip bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-6 px-5 sm:px-8">
          <button
            onClick={onEnter}
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Open the builder"
          >
            <Logo size={32} showWordmark={false} />
            <span className="hidden text-[14px] font-semibold tracking-[-0.025em] sm:inline">
              AI Website Builder
            </span>
          </button>

          <nav className="ml-4 hidden items-center gap-6 text-[12.5px] font-medium text-ink-muted lg:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#projects" className="transition-colors hover:text-ink">
              What you can ship
            </a>
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#providers" className="transition-colors hover:text-ink">
              Providers
            </a>
            <a href="#faq" className="transition-colors hover:text-ink">
              FAQ
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={onToggleTheme}
              className="btn btn-icon btn-ghost"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            </button>
            <a
              href="https://github.com/lab1207/AI-Website-Builder"
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-md btn-ghost hidden sm:inline-flex"
            >
              <Icon name="github" size={15} />
              <span>GitHub</span>
            </a>
            <button onClick={onEnter} className="btn btn-md btn-primary">
              {returning ? 'Back to builder' : 'Start building'}
              <Icon name="arrow-right" size={13} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero ------------------------------------------------------------ */}
        <section className="relative">
          <div className="landing-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
          <div
            className="hero-halo -left-24 top-16 h-72 w-72"
            style={{ background: 'color-mix(in srgb, var(--accent) 22%, transparent)' }}
          />
          <div
            className="hero-halo right-0 top-40 h-80 w-80"
            style={{ background: 'color-mix(in srgb, var(--violet) 16%, transparent)' }}
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10 lg:pb-24 lg:pt-20">
            <Reveal className="min-w-0">
              <div className="flex flex-col items-start">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-[5px] text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted shadow-[var(--shadow-sm)] backdrop-blur">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  Open source · bring your own key
                </span>

                <h1 className="display mt-6 text-[46px] leading-[0.96] sm:text-[62px] lg:text-[70px]">
                  Describe it.
                  <br />
                  Watch it become
                  <br />
                  a <em>real</em> website.
                </h1>

                <p className="mt-6 max-w-[540px] text-[15.5px] leading-relaxed text-ink-muted sm:text-[16.5px]">
                  Not a mockup. A complete site you can click through, refine by pointing at
                  it, version, and publish — in HTML, React, Vue, or Next.js. Six AI providers,
                  your own key, nothing leaving this browser.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-2.5">
                  <button onClick={onEnter} className="btn btn-lg btn-primary">
                    {returning ? 'Open your builder' : 'Start building — free'}
                    <Icon name="arrow-right" size={15} />
                  </button>
                  <a href="#features" className="btn btn-lg btn-secondary">
                    See what’s inside
                    <Icon name="arrow-down" size={14} />
                  </a>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] font-medium text-ink-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="check" size={12} className="text-success" />
                    No account
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="check" size={12} className="text-success" />
                    No backend
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="check" size={12} className="text-success" />
                    GPL-3.0, forever
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120} className="relative min-w-0">
              <div className="relative mx-auto w-full max-w-[590px] lg:max-w-none">
                <div className="mock-window overflow-hidden rounded-[22px]">
                  <div className="flex h-10 items-center gap-2 border-b border-line/70 px-3.5">
                    <span className="mock-dots">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="ml-1 font-mono text-[10px] text-ink-faint">
                      builder / hush
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-[2px] text-[9px] font-bold uppercase tracking-wider text-success">
                      <span className="h-1 w-1 rounded-full bg-success" />
                      live
                    </span>
                  </div>

                  <div className="grid grid-cols-[0.82fr_1.18fr]">
                    <div className="border-r border-line/70 p-3.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        <Icon name="sparkles" size={10} className="text-accent" />
                        Prompt
                      </div>
                      <div className="mt-2.5 rounded-xl border border-line bg-surface p-2.5 text-[10px] leading-relaxed text-ink-muted">
                        <span className="typing-line inline-block text-ink">
                          A calm site for a sleep app called Hush
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {['Layout planned', 'Sections written', 'Styles polished', 'Preview ready'].map(
                          (label, index) => (
                            <div
                              key={label}
                              className="flex items-center gap-2 text-[9.5px] text-ink-muted"
                              style={{ opacity: 1 - index * 0.08 }}
                            >
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success/12 text-success">
                                <Icon name="check" size={8} strokeWidth={2.5} />
                              </span>
                              {label}
                            </div>
                          ),
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1">
                        {['Multi-page', 'Tailwind', 'Custom domain'].map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-line bg-surface/70 px-1.5 py-[2px] text-[8.5px] font-semibold text-ink-faint"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-surface-2/60 p-2.5">
                      <div className="mb-2 flex items-center gap-1">
                        {['desktop', 'tablet', 'smartphone'].map((device, index) => (
                          <span
                            key={device}
                            className={`flex h-5 w-5 items-center justify-center rounded ${
                              index === 0 ? 'bg-surface text-ink' : 'text-ink-faint'
                            }`}
                          >
                            <Icon name={device as IconName} size={9} />
                          </span>
                        ))}
                        <span className="ml-auto font-mono text-[8px] text-ink-faint">
                          index.html
                        </span>
                      </div>

                      <div className="mock-site relative overflow-hidden rounded-[10px] p-3.5 text-[#f7ecdf] mock-shadow">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-[12px] font-semibold tracking-tight">
                            hush.
                          </span>
                          <div className="flex items-center gap-2 text-[7px] text-white/60">
                            <span>Story</span>
                            <span>Sounds</span>
                            <span className="rounded-full bg-white/12 px-1.5 py-[2px] text-white">
                              Join
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 max-w-[190px]">
                          <p className="font-display text-[21px] leading-[1.02] tracking-[-0.03em]">
                            Sleep,
                            <br />
                            without the
                            <br />
                            <em className="text-[#ffbf9b]">counting.</em>
                          </p>
                          <p className="mt-2 max-w-[150px] text-[7.5px] leading-relaxed text-white/60">
                            A quieter bedtime ritual, designed with sleep scientists.
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#ffe0c9] px-2.5 py-[5px] text-[7px] font-bold text-[#3b1420]">
                            Join the waitlist
                            <Icon name="arrow-right" size={7} />
                          </span>
                        </div>

                        <div className="mt-5 flex gap-1.5">
                          {[0, 1, 2].map((index) => (
                            <div
                              key={index}
                              className="h-9 flex-1 rounded-[5px] border border-white/10 bg-white/[0.06] p-1.5"
                            >
                              <div className="h-1 w-4 rounded-full bg-[#ffbf9b]/70" />
                              <div className="mt-1 h-1 w-7 rounded-full bg-white/20" />
                              <div className="mt-1 h-1 w-5 rounded-full bg-white/10" />
                            </div>
                          ))}
                        </div>

                        <div className="mock-site-photo absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-80 blur-[1px]" />
                      </div>

                      <div className="mt-2 flex items-center justify-between rounded-md border border-line bg-surface px-2 py-1.5">
                        <span className="inline-flex items-center gap-1 text-[8px] text-ink-faint">
                          <Icon name="globe" size={8} />
                          hush.studio
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-[2px] text-[7.5px] font-bold text-white">
                          Publish
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -left-3 top-[30%] hidden rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-[var(--shadow-md)] backdrop-blur sm:flex sm:items-center sm:gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success/12 text-success">
                    <Icon name="check" size={12} strokeWidth={2.4} />
                  </span>
                  <div>
                    <p className="text-[9.5px] font-bold text-ink">3 issues auto-fixed</p>
                    <p className="text-[8px] text-ink-faint">contrast · spacing · links</p>
                  </div>
                </div>

                <div className="absolute -bottom-5 right-4 hidden items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-[var(--shadow-md)] backdrop-blur sm:flex">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon name="globe" size={12} />
                  </span>
                  <div>
                    <p className="text-[9.5px] font-bold text-ink">Published to your domain</p>
                    <p className="text-[8px] text-ink-faint">CNAME included · HTTPS ready</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="border-y border-line/70 bg-surface/40">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-4 sm:px-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                Works with
              </span>
              {PROVIDERS.map((provider) => (
                <span
                  key={provider.id}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-muted"
                >
                  <ProviderMark provider={provider.id} size={17} />
                  {provider.label.replace('Anthropic ', '')}
                </span>
              ))}
              <span className="hidden text-[10px] text-ink-faint sm:inline">+ any OpenAI-compatible endpoint</span>
            </div>
          </div>
        </section>

        {/* Features ------------------------------------------------------- */}
        <section id="features" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal>
            <div className="max-w-[680px]">
              <span className="eyebrow">
                <span className="h-px w-7 bg-accent" />
                The whole workshop
              </span>
              <h2 className="display mt-4 text-[38px] sm:text-[52px]">
                Everything between <em>“what if”</em> and a live URL.
              </h2>
              <p className="mt-4 max-w-[590px] text-[14.5px] leading-relaxed text-ink-muted">
                A prompt box is the beginning, not the product. This is the loop around it:
                preview, edit, compare, fix, export, publish.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 50}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-md)]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-105">
                    <Icon name={feature.icon} size={17} />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.015em]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
                    {feature.body}
                  </p>

                  {index === 0 && (
                    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface-2">
                      <div className="flex items-center gap-1 border-b border-line px-2.5 py-1.5">
                        <span className="mock-dots scale-75">
                          <span />
                          <span />
                          <span />
                        </span>
                        <span className="ml-auto rounded bg-surface px-1.5 py-0.5 font-mono text-[8px] text-ink-faint">
                          preview
                        </span>
                      </div>
                      <div className="p-2.5">
                        <div className="rounded-lg border border-line bg-gradient-to-br from-[#1c1526] to-[#47203a] p-3 text-white/80">
                          <div className="h-1.5 w-8 rounded-full bg-white/30" />
                          <div className="mt-2 h-3 w-24 rounded bg-white/70" />
                          <div className="mt-1.5 h-1.5 w-32 rounded bg-white/20" />
                          <div className="mt-2.5 flex gap-1">
                            <span className="h-3.5 w-10 rounded bg-[#ffbf9b]" />
                            <span className="h-3.5 w-8 rounded border border-white/20" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {index === 1 && (
                    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface-2 p-2.5">
                      <div className="relative h-[104px] overflow-hidden rounded-lg bg-[#171310]">
                        <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5">
                          <span className="h-1 w-10 rounded-full bg-white/20" />
                          <span className="font-mono text-[7px] text-white/30">preview</span>
                        </div>
                        <div className="p-3">
                          <div className="h-1.5 w-14 rounded-full bg-white/25" />
                          <div className="mt-1.5 h-3 w-28 rounded bg-white/75" />
                          <div className="mt-1.5 h-1.5 w-20 rounded-full bg-white/20" />
                          <div className="mt-2 h-3 w-9 rounded-full bg-[#ffbf9b]" />
                        </div>
                        <span className="absolute left-[52%] top-[51%] flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/60 bg-surface text-accent shadow-[0_0_0_4px_rgb(233_79_34/0.14)]">
                          <Icon name="cursor" size={11} />
                        </span>
                        <span className="absolute bottom-2 right-2 rounded-md border border-line bg-surface px-2 py-1 text-[7.5px] font-semibold text-ink shadow-[var(--shadow-sm)]">
                          “warmer, quieter”
                        </span>
                      </div>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="mt-5 space-y-1 rounded-xl border border-line bg-surface-2 p-2 font-mono text-[9px]">
                      <p className="diff-add rounded px-1.5 py-0.5">+ .hero &#123; padding: 88px 0 &#125;</p>
                      <p className="diff-remove rounded px-1.5 py-0.5">− .hero &#123; padding: 40px 0 &#125;</p>
                      <p className="diff-add rounded px-1.5 py-0.5">+ .hero h1 &#123; letter-spacing: -.04em &#125;</p>
                    </div>
                  )}

                  {index === 3 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {['index.html', 'about.html', 'work.html', 'contact.html'].map((page, pageIndex) => (
                        <span
                          key={page}
                          className={`rounded-md border px-2 py-1 font-mono text-[8.5px] ${
                            pageIndex === 0
                              ? 'border-accent/30 bg-accent-soft text-accent'
                              : 'border-line bg-surface-2 text-ink-faint'
                          }`}
                        >
                          {page}
                        </span>
                      ))}
                    </div>
                  )}

                  {index === 4 && (
                    <div className="mt-5 flex items-center gap-1.5">
                      {['React', 'Vue', 'Next'].map((label) => (
                        <span
                          key={label}
                          className="rounded-md border border-line bg-surface-2 px-2 py-1 text-[8.5px] font-semibold text-ink-muted"
                        >
                          {label}
                        </span>
                      ))}
                      <span className="ml-auto inline-flex items-center gap-1 text-[8.5px] font-semibold text-success">
                        <Icon name="eye" size={9} />
                        preview included
                      </span>
                    </div>
                  )}

                  {index === 5 && (
                    <div className="mt-5 rounded-xl border border-line bg-surface-2 p-2.5">
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <Icon name="lock" size={9} className="text-success" />
                        <span className="font-mono text-ink-muted">hush.studio</span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[7.5px] font-bold text-success">
                          connected
                        </span>
                      </div>
                    </div>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Project types -------------------------------------------------- */}
        <section id="projects" className="border-y border-line/70 bg-surface/45">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <Reveal>
                <span className="eyebrow">
                  <span className="h-px w-7 bg-accent" />
                  More than HTML
                </span>
                <h2 className="display mt-4 text-[38px] sm:text-[50px]">
                  Four stacks. <em>One</em> conversation.
                </h2>
              </Reveal>
              <Reveal delay={80}>
                <p className="max-w-[560px] text-[14px] leading-relaxed text-ink-muted lg:ml-auto">
                  Pick the output before you start, or let the idea decide. Each project exports
                  as a real, runnable folder — not a single pasted file. Framework exports include
                  the scaffold, dependencies, and the exact command to run it.
                </p>
              </Reveal>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {projectTypes.map((type, index) => (
                <Reveal key={type.label} delay={index * 60}>
                  <div className="flex h-full flex-col rounded-[20px] border border-line bg-canvas p-4 transition-colors hover:border-line-strong">
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted">
                        <Icon name={type.icon} size={15} />
                      </span>
                      <span className="font-mono text-[9px] text-ink-faint">0{index + 1}</span>
                    </div>
                    <h3 className="mt-4 text-[14px] font-semibold">{type.label}</h3>
                    <p className="mt-1.5 flex-1 text-[11.5px] leading-relaxed text-ink-muted">
                      {type.body}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {type.files.map((file) => (
                        <span
                          key={file}
                          className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[8.5px] text-ink-faint"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={120}>
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  Also inside
                </span>
                {[
                  'Tailwind output',
                  'Version diffs',
                  'Custom domains',
                  'Figma import',
                  'Image paste',
                  'Auto-fix',
                  'Code explanations',
                  'Sandboxed preview',
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-1 text-[10.5px] font-medium text-ink-muted"
                  >
                    <Icon name="check" size={9} className="text-success" />
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* How it works --------------------------------------------------- */}
        <section id="how" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow">
                  <span className="h-px w-7 bg-accent" />
                  The loop
                </span>
                <h2 className="display mt-4 text-[38px] sm:text-[50px]">
                  Three steps. <em>No</em> setup.
                </h2>
              </div>
              <p className="max-w-[340px] text-[12.5px] leading-relaxed text-ink-faint">
                No install, no account, no build pipeline on your machine. Open the page and
                start.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 80}>
                <div className="relative h-full rounded-[22px] border border-line bg-surface p-6 shadow-[var(--shadow-sm)]">
                  <span className="display text-[44px] leading-none text-line-strong">{step.number}</span>
                  <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{step.body}</p>
                  {index < 2 && (
                    <span className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-canvas text-ink-faint md:flex">
                      <Icon name="arrow-right" size={11} />
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Providers ------------------------------------------------------ */}
        <section id="providers" className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-[30px] bg-[#12100f] px-6 py-12 text-[#f8f3ea] sm:px-12 lg:px-16 lg:py-16">
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full blur-[90px]"
                style={{ background: 'rgb(233 79 34 / 0.28)' }}
              />
              <div
                className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full blur-[100px]"
                style={{ background: 'rgb(114 87 255 / 0.2)' }}
              />

              <div className="relative grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                <div>
                  <span className="eyebrow text-[#b6a99b]">
                    <span className="h-px w-7 bg-[#ff6a3d]" />
                    Bring your own model
                  </span>
                  <h2 className="display mt-4 text-[38px] text-[#f8f3ea] sm:text-[50px]">
                    Your model. Your key.
                    <br />
                    Your <em className="text-[#ff8a5f]">bill.</em>
                  </h2>
                  <p className="mt-4 max-w-[470px] text-[13.5px] leading-relaxed text-[#b6a99b]">
                    A key lives in this browser, one per provider. Requests go straight from your
                    tab to the provider — there is no server of ours in the middle, and no shared
                    key to run out.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {[
                      ['lock', 'Stored locally'],
                      ['shield', 'CI scans every commit'],
                      ['cloud', 'Any OpenAI-compatible URL'],
                    ].map(([icon, label]) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-[#d8cdc0]"
                      >
                        <Icon name={icon as IconName} size={10} className="text-[#ff8a5f]" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                  {PROVIDERS.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5"
                    >
                      <ProviderMark provider={provider.id} size={24} />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-[#f8f3ea]">
                          {provider.label}
                        </p>
                        <p className="truncate text-[8.5px] text-[#94887b]">
                          {provider.keyPlaceholder}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FAQ ------------------------------------------------------------ */}
        <section id="faq" className="mx-auto max-w-4xl px-5 pb-20 sm:px-8 lg:pb-28">
          <Reveal>
            <div className="text-center">
              <span className="eyebrow">Straight answers</span>
              <h2 className="display mt-3 text-[34px] sm:text-[44px]">The things people ask.</h2>
            </div>
          </Reveal>

          <div className="mt-9 divide-y divide-line rounded-[22px] border border-line bg-surface px-5 shadow-[var(--shadow-sm)]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-semibold [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-ink-faint transition-transform group-open:rotate-45">
                    <Icon name="plus" size={11} />
                  </span>
                </summary>
                <p className="max-w-[640px] pt-2.5 text-[12.5px] leading-relaxed text-ink-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA ------------------------------------------------------ */}
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[30px] border border-line bg-surface px-6 py-14 text-center shadow-[var(--shadow-md)] sm:px-12">
              <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />
              <div
                className="pointer-events-none absolute left-1/2 top-0 h-64 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
                style={{ background: 'color-mix(in srgb, var(--accent) 18%, transparent)' }}
              />
              <div className="relative">
                <span className="eyebrow">The blank page is over</span>
                <h2 className="display mx-auto mt-4 max-w-[760px] text-[40px] sm:text-[58px]">
                  Your next site is <em>one sentence</em> away.
                </h2>
                <p className="mx-auto mt-4 max-w-[480px] text-[13.5px] leading-relaxed text-ink-muted">
                  Bring a screenshot, a rough idea, or nothing but a name. The builder takes it
                  from there.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                  <button onClick={onEnter} className="btn btn-lg btn-primary">
                    Open the builder
                    <Icon name="arrow-right" size={15} />
                  </button>
                  <a
                    href="https://github.com/lab1207/AI-Website-Builder"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn-lg btn-secondary"
                  >
                    <Icon name="github" size={15} />
                    Star on GitHub
                  </a>
                </div>
                <p className="mt-4 text-[10.5px] text-ink-faint">
                  No sign-up · No credit card · Self-hostable
                </p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line bg-surface/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} showWordmark={false} />
            <div>
              <p className="text-[12px] font-semibold">AI Website Builder</p>
              <p className="text-[10.5px] text-ink-faint">Prompt to preview to published.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-ink-muted">
            <button onClick={onEnter} className="transition-colors hover:text-ink">
              Builder
            </button>
            <a
              href="https://github.com/lab1207/AI-Website-Builder"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink"
            >
              GitHub
            </a>
            <a
              href="https://github.com/lab1207/AI-Website-Builder/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink"
            >
              License
            </a>
            <a
              href="https://github.com/lab1207/AI-Website-Builder/blob/main/SECURITY.md"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink"
            >
              Security
            </a>
          </div>

          <p className="text-[10.5px] text-ink-faint">
            GPL-3.0 · Built in the open · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
