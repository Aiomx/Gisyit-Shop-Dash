import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { RecentOrdersTable } from "./_components/recent-orders-table";
import { StoreStatsCards } from "./_components/store-stats-cards";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">数据看板</h1>
        <p className="text-muted-foreground">商店运营数据概览</p>
      </div>
      <StoreStatsCards />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <RecentOrdersTable />
        <ChartAreaInteractive />
      </div>
    </div>
  );
}
