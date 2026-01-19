import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Shield, Zap, Bot } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
              <Zap className="h-4 w-4" />
              Paper Trading • Live Trading • Shadow Mode
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Trade Smarter on
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text"> Polymarket</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              The ultimate paper trading platform for Polymarket. Test strategies risk-free,
              automate with Python scripts, and trade with confidence.
            </p>

            <div className="flex gap-4 justify-center">
              <Link href="/disclaimer">
                <Button size="lg" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Everything You Need to Trade
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            From paper trading to live execution, we've got you covered.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: BarChart3,
              title: 'Paper Trading',
              description: 'Trade with $10,000 virtual funds. Perfect for learning and testing.',
            },
            {
              icon: Bot,
              title: 'Python Strategies',
              description: 'Write custom strategies in Python with our intuitive SDK.',
            },
            {
              icon: Shield,
              title: 'Risk Management',
              description: 'Kill switch, position limits, and daily loss limits built-in.',
            },
            {
              icon: Zap,
              title: 'Live Trading',
              description: 'When ready, switch to live mode with one click.',
            },
          ].map((feature, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-12 text-center border border-blue-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Trading?
          </h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Join thousands of traders using PolyTrader to perfect their strategies before going live.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="font-semibold text-white">PolyTrader</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/disclaimer" className="hover:text-white transition-colors">
                Risk Disclaimer
              </Link>
              <a href="https://polymarket.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">
                Polymarket
              </a>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 PolyTrader. Not affiliated with Polymarket.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
