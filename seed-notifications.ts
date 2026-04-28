import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { NotificationService } from "@/lib/notification-service";

async function seedNotifications() {
  try {
    console.log("Seeding notifications...");

    // Get all users
    const users = await db.query.users.findMany();
    if (users.length === 0) {
      console.log("No users found. Please create users first.");
      return;
    }

    const adminUsers = users.filter(u => u.email?.includes("admin") || u.email?.includes("super"));
    const regularUsers = users.filter(u => !adminUsers.includes(u));

    // Create system-wide notifications
    await NotificationService.notifyFeatureUpdate(
      "Enhanced Dashboard",
      "New interactive charts and improved performance metrics"
    );

    await NotificationService.notifyBugFixed(
      "Notification Bell",
      "Fixed notification count display in header"
    );

    await NotificationService.notifyUIUpdate(
      "Notification Center",
      "Improved notification cards with better theming"
    );

    await NotificationService.notifySystemAlert(
      "Database maintenance completed successfully",
      "low"
    );

    await NotificationService.notifySecurityAlert(
      "Security audit completed - no vulnerabilities found"
    );

    await NotificationService.notifyMaintenanceScheduled(
      "Tonight at 2 AM",
      "2 hours",
      "System backup and optimization"
    );

    // Create user-specific notifications
    for (const user of users) {
      // Appointment notifications
      await NotificationService.createNotification({
        userId: user.id,
        type: "appointment",
        title: "Appointment Reminder",
        message: "You have an appointment scheduled for tomorrow at 10:00 AM",
        metadata: { appointmentId: "sample-1", action: "reminder" }
      });

      // Message notifications
      await NotificationService.createNotification({
        userId: user.id,
        type: "message",
        title: "New Message",
        message: "You have received a new message from the system administrator",
        metadata: { senderId: "admin", senderName: "System Admin", action: "received" }
      });

      // System notifications
      await NotificationService.createNotification({
        userId: user.id,
        type: "system",
        title: "Welcome to Joan Healthcare OS",
        message: "Your account has been successfully set up. Explore the dashboard to get started.",
        metadata: { action: "welcome" }
      });

      // Alert notifications
      await NotificationService.createNotification({
        userId: user.id,
        type: "alert",
        title: "System Update Available",
        message: "A new system update is available. Please refresh your browser to apply changes.",
        metadata: { action: "update_available" }
      });

      // Broadcast notifications
      await NotificationService.createNotification({
        userId: user.id,
        type: "broadcast",
        title: "Monthly Staff Meeting",
        message: "Don't forget the monthly staff meeting this Friday at 3 PM in Conference Room A.",
        metadata: { action: "meeting_reminder" }
      });
    }

    // Create some unread notifications for demonstration
    for (const user of users.slice(0, 2)) { // Only for first 2 users
      await NotificationService.createNotification({
        userId: user.id,
        type: "system",
        title: "Unread Test Notification",
        message: "This is a test notification that should appear as unread.",
        metadata: { action: "test" }
      });
    }

    console.log("Notifications seeded successfully!");
  } catch (error) {
    console.error("Error seeding notifications:", error);
  }
}

// Run the seed function
seedNotifications();
