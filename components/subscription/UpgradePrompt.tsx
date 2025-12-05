'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap } from 'lucide-react';

interface UpgradePromptProps {
  title: string;
  message: string;
  onUpgrade: () => void;
  variant?: 'warning' | 'error';
}

export function UpgradePrompt({ title, message, onUpgrade, variant = 'warning' }: UpgradePromptProps) {
  return (
    <Card className={variant === 'error' ? 'border-destructive' : 'border-yellow-500'}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className={`h-5 w-5 ${variant === 'error' ? 'text-destructive' : 'text-yellow-600'}`} />
          <CardTitle className={variant === 'error' ? 'text-destructive' : 'text-yellow-600'}>{title}</CardTitle>
        </div>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onUpgrade}
          className="w-full"
          size="lg"
        >
          <Zap className="mr-2 h-4 w-4" />
          Upgrade to Pro
        </Button>
      </CardContent>
    </Card>
  );
}
