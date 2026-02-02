"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Notification {
  id: string;
  type: "JOB_ASSIGNED" | "COMMENT_MENTION" | "COMMENT_REPLY";
  userId: string;
  jobPlanId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// Query keys factory
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (limit?: number) => [...notificationKeys.all, "list", limit] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

// Fetch functions
async function fetchNotifications(limit: number = 10): Promise<NotificationsResponse> {
  const response = await fetch(`/api/notifications?limit=${limit}`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  
  return response.json();
}

async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  const response = await fetch("/api/notifications/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationIds }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to mark notifications as read");
  }
}

async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch("/api/notifications/read-all", {
    method: "POST",
  });
  
  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }
}

// Hooks

/**
 * Hook to fetch notifications with smart polling
 * @param options - Configuration options
 * @param options.limit - Number of notifications to fetch (default: 10)
 * @param options.isOpen - Whether the notification dropdown is open (affects polling interval)
 * @param options.enabled - Whether to enable the query
 */
export function useNotifications(
  options: {
    limit?: number;
    isOpen?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { limit = 10, isOpen = false, enabled = true } = options;
  
  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: () => fetchNotifications(limit),
    enabled,
    // Faster polling when dropdown is open, slower when closed
    refetchInterval: isOpen ? 10_000 : 60_000,
    // Don't poll in background (saves resources when tab is hidden)
    refetchIntervalInBackground: false,
    // Keep data fresh for 30 seconds
    staleTime: 30_000,
  });
}

/**
 * Hook to mark specific notifications as read
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markNotificationsRead,
    onMutate: async (notificationIds) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: notificationKeys.all,
      });
      
      // Optimistically update all notification caches
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.all },
        (old) => {
          if (!old) return old;
          
          const updatedNotifications = old.notifications.map((n) =>
            notificationIds.includes(n.id) ? { ...n, isRead: true } : n
          );
          
          const newUnreadCount = updatedNotifications.filter((n) => !n.isRead).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        }
      );
      
      return { previousData };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      
      const previousData = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: notificationKeys.all,
      });
      
      // Optimistically mark all as read
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.all },
        (old) => {
          if (!old) return old;
          return {
            notifications: old.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
          };
        }
      );
      
      return { previousData };
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
