import MapWidget from '@/components/dashboard/MapWidget';
import KPIGrid from '@/components/dashboard/KPIGrid';
import FaultFeed from '@/components/dashboard/FaultFeed';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4" style={{ height: '520px' }}>
        <div className="flex-1 min-w-0">
          <MapWidget />
        </div>
        <div className="w-80 flex-shrink-0 flex flex-col">
          <FaultFeed />
        </div>
      </div>
      <KPIGrid />
    </div>
  );
}
