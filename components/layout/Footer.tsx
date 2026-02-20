import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-10 px-6 bg-slate-900 text-slate-400">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-xl font-bold text-white">VisionBatch</div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <Link href="/guide" className="hover:text-white transition-colors">
              Guide
            </Link>
            <Link href="/legal/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
          <div className="text-sm">&copy; {new Date().getFullYear()} VisionBatch</div>
        </div>
      </div>
    </footer>
  );
}
