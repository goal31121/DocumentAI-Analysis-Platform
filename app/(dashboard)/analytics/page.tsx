import { InsightsDashboard } from '@/components/analytics/InsightsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">View insights and statistics about your documents</p>
      </div>
      <InsightsDashboard />
    </div>
  );
}
