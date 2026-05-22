"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type RealtimeEvent =
  | { type: "message"; data: any }
  | { type: "notification"; data: any }
  | { type: "appointment_update"; data: any }
  | { type: "queue_update"; data: any }
  | { type: "lab_result"; data: any }
  | { type: "vital_update"; data: any }
  | { type: "prescription_update"; data: any }
  | { type: "initial_data"; data: any };

interface UseRealtimeOptions {
  userId: string;
  tenantId: string;
  onMessage?: (data: any) => void;
  onNotification?: (data: any) => void;
  onAppointmentUpdate?: (data: any) => void;
  onQueueUpdate?: (data: any) => void;
  onLabResult?: (data: any) => void;
  onVitalUpdate?: (data: any) => void;
  onPrescriptionUpdate?: (data: any) => void;
  onInitialData?: (data: any) => void;
  showToasts?: boolean;
}

export function useRealtime(options: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!options.userId || !options.tenantId) return;

    const connect = () => {
      const eventSource = new EventSource(
        `/api/realtime?userId=${options.userId}&tenantId=${options.tenantId}`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log("Real-time connection established");
      };

      eventSource.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          setLastEvent(data);

          // Handle different event types
          switch (data.type) {
            case "message":
              if (options.onMessage) {
                options.onMessage(data.data);
              }
              if (options.showToasts !== false) {
                toast.success(`New message from ${data.data.senderName}`, {
                  description: data.data.message.length > 50
                    ? `${data.data.message.substring(0, 50)}...`
                    : data.data.message,
                });
              }
              break;

            case "notification":
              if (options.onNotification) {
                options.onNotification(data.data);
              }
              if (options.showToasts !== false) {
                toast.info(data.data.title, {
                  description: data.data.message,
                });
              }
              break;

            case "appointment_update":
              if (options.onAppointmentUpdate) {
                options.onAppointmentUpdate(data.data);
              }
              if (options.showToasts !== false) {
                toast.info("Appointment Updated", {
                  description: data.data.message || "An appointment has been updated",
                });
              }
              break;

            case "queue_update":
              if (options.onQueueUpdate) {
                options.onQueueUpdate(data.data);
              }
              if (options.showToasts !== false) {
                toast.info("Queue Updated", {
                  description: data.data.message || "The queue has been updated",
                });
              }
              break;

            case "lab_result":
              if (options.onLabResult) {
                options.onLabResult(data.data);
              }
              if (options.showToasts !== false) {
                toast.success("Lab Results Available", {
                  description: data.data.message || "New lab results are ready",
                });
              }
              break;

            case "vital_update":
              if (options.onVitalUpdate) {
                options.onVitalUpdate(data.data);
              }
              if (options.showToasts !== false) {
                toast.info("Vitals Updated", {
                  description: data.data.message || "Patient vitals have been updated",
                });
              }
              break;

            case "prescription_update":
              if (options.onPrescriptionUpdate) {
                options.onPrescriptionUpdate(data.data);
              }
              if (options.showToasts !== false) {
                toast.info("Prescription Updated", {
                  description: data.data.message || "A prescription has been updated",
                });
              }
              break;

            case "initial_data":
              if (options.onInitialData) {
                options.onInitialData(data.data);
              }
              break;
          }
        } catch (error) {
          console.error("Failed to parse real-time event:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("Real-time connection error:", error);
        setIsConnected(false);

        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (eventSourceRef.current === eventSource) {
            connect();
          }
        }, 5000);
      };

      eventSourceRef.current = eventSource;
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
    };
  }, [options.userId, options.tenantId]);

  return {
    isConnected,
    lastEvent,
  };
}
