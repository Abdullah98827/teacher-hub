import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createNotification, sendLocalNotification } from '../utils/notificationService';

/**
 * Custom hook to easily send notifications from anywhere in the app
 * Usage: const { sendNotif } = useSendNotification();
 *        sendNotif('user-id', 'follow', 'New Follower', 'John followed you', { followerId: 'john-id' });
 */
export const useSendNotification = () => {
  const { user } = useAuth();

  const sendNotif = useCallback(
    async (userId, type, title, body, data = {}) => {
      try {
        // Create database record
        const notification = await createNotification(userId, type, title, body, data);

        // Send local notification if it's for the current user
        if (userId === user?.id) {
          await sendLocalNotification(title, body, data);
        }

        return notification;
      } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
      }
    },
    [user?.id]
  );

  return { sendNotif };
};

/**
 * Pre-configured notification types for consistency
 */
export const NOTIFICATION_TYPES = {
  FOLLOW: 'follow',
  UNFOLLOW: 'unfollow',
  COMMENT: 'comment',
  COMMENT_REPLY: 'comment_reply',
  RATING: 'rating',
  MESSAGE: 'message',
  GROUP_MESSAGE: 'group_message',
  RESOURCE_UPLOAD: 'resource_upload',
  RESOURCE_FAVORITE: 'resource_favorite',
  VERIFICATION: 'verification',
  MEMBERSHIP: 'membership',
  REPORT: 'report',
  REPORT_RESOLVED: 'report_resolved',
  CONTACT_REQUEST: 'contact_request',
  CONTACT_REQUEST_ACCEPTED: 'contact_request_accepted',
  TEACHER_APPROVED: 'teacher_approved',
};

/**
 * Notification templates for different events
 */
export const notificationTemplates = {
  [NOTIFICATION_TYPES.FOLLOW]: (userName) => ({
    title: 'New Follower',
    body: `${userName} started following you`,
  }),
  
  [NOTIFICATION_TYPES.UNFOLLOW]: (userName) => ({
    title: 'Follower Unfollowed',
    body: `${userName} unfollowed you`,
  }),

  [NOTIFICATION_TYPES.COMMENT]: (userName, resourceTitle) => ({
    title: 'New Comment',
    body: `${userName} commented on "${resourceTitle}"`,
  }),
  
  [NOTIFICATION_TYPES.COMMENT_REPLY]: (userName) => ({
    title: 'New Reply',
    body: `${userName} replied to your comment`,
  }),
  
  [NOTIFICATION_TYPES.RATING]: (userName, stars) => ({
    title: 'New Rating',
    body: `${userName} gave you ${stars} stars`,
  }),
  
  [NOTIFICATION_TYPES.MESSAGE]: (userName) => ({
    title: 'New Message',
    body: `${userName} sent you a message`,
  }),
  
  [NOTIFICATION_TYPES.GROUP_MESSAGE]: (groupName, senderName) => ({
    title: `Message in ${groupName}`,
    body: `${senderName} sent a message`,
  }),
  
  [NOTIFICATION_TYPES.RESOURCE_UPLOAD]: (userName, resourceTitle) => ({
    title: 'New Resource',
    body: `${userName} uploaded "${resourceTitle}"`,
  }),
  
  [NOTIFICATION_TYPES.RESOURCE_FAVORITE]: (userName, resourceTitle) => ({
    title: 'Favorite Added',
    body: `${userName} added "${resourceTitle}" to favorites`,
  }),
  
  [NOTIFICATION_TYPES.VERIFICATION]: () => ({
    title: 'Verification Updated',
    body: 'Your teacher verification status has been updated',
  }),
  
  [NOTIFICATION_TYPES.MEMBERSHIP]: (plan) => ({
    title: 'Membership Updated',
    body: `Your membership has been updated to ${plan}`,
  }),
  
  [NOTIFICATION_TYPES.REPORT]: () => ({
    title: 'Report Received',
    body: 'Your report has been received and will be reviewed',
  }),
  
  [NOTIFICATION_TYPES.REPORT_RESOLVED]: () => ({
    title: 'Report Resolved',
    body: 'Your report has been reviewed and resolved',
  }),
  
  [NOTIFICATION_TYPES.CONTACT_REQUEST]: (userName) => ({
    title: 'New Contact Request',
    body: `${userName} wants to contact you`,
  }),
  
  [NOTIFICATION_TYPES.CONTACT_REQUEST_ACCEPTED]: (userName) => ({
    title: 'Contact Request Accepted',
    body: `${userName} accepted your contact request`,
  }),
  
  [NOTIFICATION_TYPES.TEACHER_APPROVED]: () => ({
    title: 'Teacher Verified',
    body: 'Congratulations! Your teacher verification has been approved',
  }),
};

/**
 * Hook for sending report resolution notifications
 * Usage: const { notifyCommentReportResolved } = useReportNotifications();
 *        await notifyCommentReportResolved(reporterId, resourceTitle, resolution);
 */
export const useReportNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyCommentReportResolved = useCallback(
    async (reporterId, resourceTitle, resolution) => {
      try {
        const title = resolution === "resolved" 
          ? "Report Approved" 
          : "Report Dismissed";
        
        const body = resolution === "resolved"
          ? `Your report on "${resourceTitle}" has been approved. The comment has been removed.`
          : `Your report on "${resourceTitle}" has been reviewed and dismissed.`;

        await sendNotif(
          reporterId,
          NOTIFICATION_TYPES.REPORT_RESOLVED,
          title,
          body,
          {
            resourceTitle,
            resolution,
            type: NOTIFICATION_TYPES.REPORT_RESOLVED,
          }
        );
      } catch (error) {
        console.error('Error notifying report resolution:', error);
        throw error;
      }
    },
    [sendNotif]
  );

  return { notifyCommentReportResolved };
};