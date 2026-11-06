
import Header from "@/components/dashboard/header";
import AnalyticsDashboard from "@/components/dashboard/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen p-5 sm:p-8">
      <Header
        title="Analytics"
        description="Monitor queue performance and service efficiency."
      />

      <div className="mt-8">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
