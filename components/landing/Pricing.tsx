'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out DocAI',
    features: ['10 documents per month', 'Basic Q&A', 'PDF & DOCX support', 'Community support'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For professionals and small teams',
    features: [
      '100 documents per month',
      'Advanced Q&A with citations',
      'All file formats',
      'Analytics dashboard',
      'Priority support',
      'API access',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Unlimited documents',
      'Custom AI models',
      'Dedicated support',
      'SSO integration',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="py-32 bg-background"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">Simple, Transparent Pricing</h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">Choose the plan that works best for you</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`h-full relative border ${
                plan.popular ? 'border-foreground/20' : 'border-border/50'
              } bg-background hover:border-border transition-colors`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-xs font-medium rounded-full">
                  Most Popular
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl mb-2 text-foreground">{plan.name}</CardTitle>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-foreground/70 text-lg">/month</span>}
                </div>
                <CardDescription className="mt-3 text-base text-foreground/70">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start space-x-3"
                    >
                      <Check className="h-5 w-5 text-foreground/70 mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed text-foreground/70">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-md ${
                    plan.popular
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-background border border-foreground/20 text-foreground hover:bg-foreground/5'
                  } transition-colors`}
                  size="lg"
                  asChild
                >
                  <Link href="/sign-up">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
