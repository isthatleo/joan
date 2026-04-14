export function useOfflineSync() {
  // Check online/offline status
  const handleOnline = () => {
    console.log("Back online - syncing changes...");
    // Sync pending changes
  };

  const handleOffline = () => {
    console.log("Offline - using cached data");
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  return {
    isOnline: typeof window !== "undefined" ? navigator.onLine : true,
  };
}
