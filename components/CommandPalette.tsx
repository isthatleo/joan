"use client";
import { Command } from "cmdk";
import { useState } from "react";

const commands = [
  { label: "Go to Patients", action: () => window.location.href = "/patients" },
  { label: "Go to Appointments", action: () => window.location.href = "/appointments" },
  { label: "Go to Billing", action: () => window.location.href = "/billing" },
  { label: "Go to Lab", action: () => window.location.href = "/lab" },
  { label: "Go to Pharmacy", action: () => window.location.href = "/pharmacy" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2">
      <Command className="rounded-lg border shadow-md">
        <Command.Input placeholder="Search..." />
        <Command.List>
          {commands.map((cmd) => (
            <Command.Item
              key={cmd.label}
              onSelect={() => {
                cmd.action();
                setOpen(false);
              }}
            >
              {cmd.label}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
