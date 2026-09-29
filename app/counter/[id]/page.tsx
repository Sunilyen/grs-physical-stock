import { createServerClient } from "@/lib/supabaseClient";
import StockCountForm from "@/components/StockCountForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CounterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = params;
  const supabase = createServerClient();

  // Fetch counter name
  const { data: counter, error } = await supabase
    .from("counters")
    .select("counter_name")
    .eq("id", id)
    .single();

  if (error || !counter) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <StockCountForm counterId={id} counterName={counter.counter_name} />
    </div>
  );
}
