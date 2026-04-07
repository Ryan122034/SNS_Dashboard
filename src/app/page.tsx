import { ChannelDashboard } from "@/components/channel-dashboard";
import { getDashboardState } from "@/lib/dashboard-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialData = await getDashboardState();

  return <ChannelDashboard initialData={initialData} />;
}
