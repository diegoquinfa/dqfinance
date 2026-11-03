import { lazy, Suspense } from "react";
import { cn } from "cn";
import { Skeleton } from "#/shared/ui/skeleton";
import type { CompareContact } from "./compare-points";

// Recharts is ~344 kB. This boundary keeps it out of the chunk that paints the contacts list.
const ContactCompareChartGraph = lazy(
  () => import("./contact-compare-chart-graph"),
);

/** The chosen contacts and their total, month by month. */
export function ContactCompareChart({
  contacts,
  currency,
  className,
}: {
  contacts: CompareContact[];
  currency: string;
  className?: string;
}) {
  return (
    <Suspense
      fallback={
        <Skeleton className={cn("h-56 w-full", className)} aria-busy="true" />
      }
    >
      <ContactCompareChartGraph
        contacts={contacts}
        currency={currency}
        className={className}
      />
    </Suspense>
  );
}
