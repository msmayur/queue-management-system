
import Header from "@/components/dashboard/header";
import QueueWorkspace from "@/components/dashboard/queue-workspace";

export default function QueuesPage() {
  return (
    <div className="min-h-screen p-5 sm:p-8">
      <Header
        title="Queue Management"
        description="Manage customers, tokens, and service operations."
      />

      <div className="mt-8">
        <QueueWorkspace />
      </div>
    </div>
  );
}
