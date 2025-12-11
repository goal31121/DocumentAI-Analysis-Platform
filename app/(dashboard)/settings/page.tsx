'use client';

import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, User, Bell, Shield, ChevronRight } from 'lucide-react';

const settingsSections = [
  {
    title: 'Subscription',
    description: 'Manage your subscription plan and view usage',
    icon: CreditCard,
    href: '/settings/subscription',
    available: true,
  },
  {
    title: 'Profile',
    description: 'Update your personal information',
    icon: User,
    href: '/settings/profile',
    available: false,
  },
  {
    title: 'Notifications',
    description: 'Configure notification preferences',
    icon: Bell,
    href: '/settings/notifications',
    available: false,
  },
  {
    title: 'Security',
    description: 'Manage your password and security settings',
    icon: Shield,
    href: '/settings/security',
    available: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.title}
              className={section.available ? 'hover:border-primary/50 transition-colors cursor-pointer' : 'opacity-60'}
            >
              {section.available ? (
                <Link
                  href={section.href}
                  className="block"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                </Link>
              ) : (
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming soon</span>
                </CardHeader>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
