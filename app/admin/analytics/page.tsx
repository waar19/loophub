import { requireAdmin } from '@/lib/admin';
import AnalyticsContent from './AnalyticsContent';

export const metadata = {
  title: 'Analytics Dashboard - Admin',
  description: 'View platform analytics and metrics',
};

export default async function AnalyticsPage() {
  await requireAdmin();

  return <AnalyticsContent />;
}
