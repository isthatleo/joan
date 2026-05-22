"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Building2, Search, Plus, Eye, Edit, Phone, Mail, Loader2,
  Filter, Download, MapPin, Star, Clock, DollarSign
} from "lucide-react";

const orange = "#F97316";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  rating: number;
  totalOrders: number;
  reliabilityScore: number;
  averageDeliveryTime: number;
  paymentTerms: string;
  isActive: boolean;
  medicinesSupplied: number;
}

export default function SuppliersPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${slug}/pharmacy/suppliers`);
      if (res.ok) {
        setSuppliers(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(search.toLowerCase()) ||
                         supplier.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
                         supplier.city.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getRatingStars = (rating: number) => {
    return "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));
  };

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.isActive).length,
    avgRating: (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Inventory</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage pharmacy suppliers and vendors.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-all">
            <Download className="size-4" />
            Export
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm hover:opacity-90" style={{ backgroundColor: orange }}>
            <Plus className="size-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Suppliers</p>
              <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
              <Building2 className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-green-50 text-green-600 p-3 rounded-lg">
              <Phone className="size-6" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.avgRating}★</p>
            </div>
            <div className="bg-yellow-50 text-yellow-600 p-3 rounded-lg">
              <Star className="size-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers by name, contact person, or city..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-orange-300"
            />
          </div>
        </div>
      </div>

      {/* Suppliers List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 text-orange-500 animate-spin" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Building2 className="size-12 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No suppliers found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSuppliers.map(supplier => (
                <div
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier)}
                  className={`bg-card border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all ${
                    selectedSupplier?.id === supplier.id ? "ring-2 ring-orange-500" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">{supplier.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {supplier.city}, {supplier.state}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm">
                        <span className="text-yellow-600 font-semibold">{getRatingStars(supplier.rating)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{supplier.rating}/5</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Orders</span>
                      <p className="font-semibold text-foreground">{supplier.totalOrders}</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Medicines</span>
                      <p className="font-semibold text-foreground">{supplier.medicinesSupplied}</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Delivery</span>
                      <p className="font-semibold text-foreground">{supplier.averageDeliveryTime}d</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" />
                      {supplier.email}
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {supplier.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selectedSupplier ? (
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h3 className="font-semibold text-foreground mb-4">Supplier Details</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-semibold text-foreground">{selectedSupplier.name}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Contact Person</p>
                  <p className="font-semibold text-foreground">{selectedSupplier.contactPerson}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground text-sm">{selectedSupplier.email}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-semibold text-foreground">{selectedSupplier.phone}</p>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Address</p>
                  <p className="text-sm text-foreground">
                    {selectedSupplier.address}, {selectedSupplier.city}, {selectedSupplier.state} {selectedSupplier.zipCode}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="text-lg font-semibold text-yellow-600">
                      {getRatingStars(selectedSupplier.rating)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reliability</p>
                    <p className="text-lg font-semibold text-green-600">
                      {selectedSupplier.reliabilityScore}%
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Avg Delivery Time</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="size-4 text-orange-500" />
                    <p className="font-semibold text-foreground">{selectedSupplier.averageDeliveryTime} days</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Payment Terms</p>
                  <p className="font-semibold text-foreground">{selectedSupplier.paymentTerms}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border">
                  <button className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center gap-2 justify-center">
                    <Eye className="size-4" />
                    View
                  </button>
                  <button className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center gap-2 justify-center">
                    <Edit className="size-4" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <Building2 className="size-12 mx-auto mb-4 opacity-50" />
                <p>Select a supplier for details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

