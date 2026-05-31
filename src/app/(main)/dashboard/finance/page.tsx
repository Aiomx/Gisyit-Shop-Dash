import { OrderStatusSummary } from "./_components/order-status-summary";
import { RecentOrders } from "./_components/recent-orders";
import { SalesOverview } from "./_components/sales-overview";
import { TopProducts } from "./_components/top-products";

export default function Page() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <SalesOverview />
        <div className="grid flex-1 grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs md:grid-cols-2">
          <OrderStatusSummary />
          <TopProducts />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-1">
        <RecentOrders />
      </div>
    </div>
  );
}
