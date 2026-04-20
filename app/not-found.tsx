import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#07080C] px-6 py-16 text-[#F5F2EC]">
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#C9A84C]">
          Synapnode
        </p>
        <div className="mt-8 text-7xl font-black leading-none text-[#C9A84C]">404</div>
        <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#9AA4B6]">
          This page does not exist anymore or has been moved into the new Next.js app.
          Head back to the main site to continue revising.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-[#C9A84C] px-5 py-3 font-semibold text-[#07080C] transition hover:bg-[#D4B86A]"
          >
            Back to Synapnode
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-[#2A3243] px-5 py-3 font-semibold text-[#F5F2EC] transition hover:border-[#C9A84C] hover:text-[#C9A84C]"
          >
            Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}
