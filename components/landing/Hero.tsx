'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
            <span className="text-foreground">Intelligent</span>
            <br />
            <span className="gradient-text-minimal">Document Analysis</span>
          </h1>

          <p className="text-xl md:text-2xl text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Your research and thinking partner, grounded in the information you trust, built with advanced AI models.
          </p>

          <div className="flex justify-center">
            <Button
              size="lg"
              asChild
              className="bg-foreground text-background hover:bg-foreground/90 rounded-md px-8 py-6 text-base font-medium transition-colors"
            >
              <Link href="/sign-up">Try DocAI</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
