import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Integration by Parts | Synapnode',
  description:
    'Learn the integration by parts method for A-Level Maths with the core formula, when to use it, and a worked example.',
}

export default function IntegrationByPartsPage() {
  return (
    <main className="min-h-screen bg-[#0B0F14] text-slate-100">
      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="mb-6 inline-flex items-center rounded-full border border-[rgba(201,168,76,0.28)] bg-[rgba(201,168,76,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
          A-Level Maths Lesson
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Integration by parts, made simple
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Use this when an integral is a product of two expressions and a direct substitution will not cleanly work.
          The core idea is to choose one part to differentiate and the other to integrate.
        </p>

        <div className="mt-8 rounded-2xl border border-[rgba(201,168,76,0.18)] bg-[rgba(18,24,33,0.8)] p-6 shadow-xl shadow-black/20">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Core formula</p>
          <div className="mt-3 rounded-xl bg-[rgba(11,15,20,0.95)] px-4 py-5 text-center text-2xl font-semibold text-[#F5E7A3] sm:text-3xl">
            ∫u dv = uv − ∫v du
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            A good rule of thumb is <strong className="text-white">LIATE</strong>: pick the logarithmic, inverse,
            algebraic, trigonometric, then exponential part for <code>u</code> in that order where possible.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-[rgba(18,24,33,0.76)] p-6">
            <h2 className="text-xl font-semibold text-white">Worked example</h2>
            <p className="mt-3 text-slate-300">Evaluate <code>∫ x e^x dx</code>.</p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li><strong className="text-white">1.</strong> Let <code>u = x</code>, so <code>du = dx</code>.</li>
              <li><strong className="text-white">2.</strong> Let <code>dv = e^x dx</code>, so <code>v = e^x</code>.</li>
              <li><strong className="text-white">3.</strong> Substitute into the formula:</li>
            </ol>
            <div className="mt-4 rounded-xl bg-[rgba(11,15,20,0.95)] px-4 py-4 text-sm text-[#F5E7A3]">
              ∫x e^x dx = x e^x − ∫e^x dx = x e^x − e^x + C = e^x(x − 1) + C
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[rgba(18,24,33,0.76)] p-6">
            <h2 className="text-xl font-semibold text-white">When to use it</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>• Algebraic × exponential terms, like <code>x e^x</code></li>
              <li>• Algebraic × trigonometric terms, like <code>x sin x</code></li>
              <li>• Logarithms, where you can rewrite <code>∫ln x dx</code> as <code>∫1·ln x dx</code></li>
              <li>• Repeated integration by parts for higher powers such as <code>x²e^x</code></li>
            </ul>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              If you want step-by-step support on your own question, open Jarvis or generate a few practice questions next.
            </p>
          </article>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/lessons"
            className="rounded-xl bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Open lessons
          </Link>
          <Link
            href="/chat"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#C9A84C] hover:text-[#C9A84C]"
          >
            Ask Jarvis
          </Link>
          <Link
            href="/questions"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#C9A84C] hover:text-[#C9A84C]"
          >
            Practice questions
          </Link>
        </div>
      </section>
    </main>
  )
}
