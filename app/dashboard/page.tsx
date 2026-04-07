import MapWidget from '@/components/dashboard/MapWidget';
import KPIGrid from '@/components/dashboard/KPIGrid';
import FaultFeed from '@/components/dashboard/FaultFeed';
import ProgramHeader from '@/components/dashboard/ProgramHeader';
import ProgramOutputs from '@/components/dashboard/ProgramOutputs';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      {/* Program title + summary stats */}
      <ProgramHeader />

      {/* 5 administrative outputs */}
      <ProgramOutputs />

      {/* Map + Faults: stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4 lg:h-[520px]">
        <div className="flex-1 min-w-0 h-[300px] sm:h-[400px] lg:h-auto">
          <MapWidget />
        </div>
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col h-[400px] lg:h-auto">
          <FaultFeed />
        </div>
      </div>
      <KPIGrid />
    </div>
  );
}
