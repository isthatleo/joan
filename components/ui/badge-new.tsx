import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "active" | "pending" | "inactive" | "default";
  children: React.ReactNode;
}

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  const variantStyles = {
    active: "bg-orange-100 text-orange-700 border border-orange-200",
    pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    inactive: "bg-gray-100 text-gray-700 border border-gray-200",
    default: "bg-gray-100 text-gray-700 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
