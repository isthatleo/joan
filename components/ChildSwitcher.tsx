import { useFamilyStore } from "@/stores/family";

export function ChildSwitcher() {
  const { children, setActiveChild } = useFamilyStore();

  return (
    <div className="flex gap-2 mb-4">
      {children.map((c) => (
        <button
          key={c.id}
          onClick={() => setActiveChild(c.id)}
          className="px-4 py-2 border rounded"
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
