import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { marketplaceApi, type OrderRecord } from "../../services/api";
import { queryKeys } from "../../lib/queryKeys";
import { OrderConfirmedView } from "./OrderConfirmedView";
import { isOrderTrackingTerminal } from "./DeliveryStepsTracker";

export function OrderConfirmedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const initialOrder = (location.state as { initialOrder?: OrderRecord } | null)?.initialOrder;

  const {
    data: order,
    isLoading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.orders.detail(orderId || ""),
    queryFn: ({ signal }) => marketplaceApi.getOrder(orderId || "", { signal }),
    enabled: Boolean(orderId),
    initialData:
      initialOrder && (initialOrder.id === orderId || initialOrder.orderNumber === orderId)
        ? initialOrder
        : undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    // Vercel Free-friendly smart polling: only poll every 30s while delivery is active
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isOrderTrackingTerminal(status)) return false;
      return 30_000;
    },
    refetchIntervalInBackground: false
  });

  if (isLoading && !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <Clock size={32} className="animate-spin text-etukas-red mb-3" />
        <p className="text-sm font-bold text-gray-700">Loading order delivery status...</p>
      </div>
    );
  }

  if ((error && !order) || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900">Order Not Found</h2>
        <p className="mt-2 text-sm text-gray-500">
          We could not find an order with ID #{orderId}. It may have been placed under another account.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-etukas-red px-5 py-2.5 text-sm font-bold text-white shadow-xs"
        >
          <ArrowLeft size={16} /> Back to Products
        </Link>
      </div>
    );
  }

  return (
    <OrderConfirmedView
      order={order}
      onRefresh={() => void refetch()}
      isRefreshing={isFetching}
    />
  );
}
