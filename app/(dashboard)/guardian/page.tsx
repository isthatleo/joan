import { useFamilyStore } from "@/stores/family";
import { useQuery } from "@tanstack/react-query";
import { ChildSwitcher } from "@/components/ChildSwitcher";

export default function FamilyDashboard() {
  return (
    <div>
      <ChildSwitcher />
      <ChildOverview />
    </div>
  );
}

function ChildOverview() {
  const { activeChildId } = useFamilyStore();

  const { data } = useQuery({
    queryKey: ["child", activeChildId],
    queryFn: () =>
      activeChildId ? fetch(`/api/guardian/child/${activeChildId}`).then(r => r.json()) : null,
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Upcoming Appointments" value={data?.appointments?.length || 0} />
      <Card title="Medications" value={data?.medications?.length || 0} />
      <Card title="Alerts" value={data?.alerts?.length || 0} />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <p className="text-sm text-muted">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
