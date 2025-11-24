'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2"
          >
            <Logo />
            <span className="text-xl font-semibold text-foreground">DocAI</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#demo"
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Demo
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              <ThemeToggle />
              <Link
                href="/sign-in"
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
            <Sheet
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
            >
              <SheetTrigger
                asChild
                className="md:hidden"
              >
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px]"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col space-y-4 mt-8">
                  <Link
                    href="#features"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Features
                  </Link>
                  <Link
                    href="#pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="#demo"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Demo
                  </Link>
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex justify-center pb-2">
                      <ThemeToggle />
                    </div>
                    <Link
                      href="/sign-in"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2"
                    >
                      Sign In
                    </Link>
                    <Button
                      className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-md"
                      asChild
                    >
                      <Link
                        href="/sign-up"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started
                      </Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
