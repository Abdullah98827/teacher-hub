/**
 * Admin Notification Integration Hooks
 * For notifying admins of system events and actions requiring admin review
 * 
 * Usage:
 * const { notifyAdminNewReport } = useAdminNotifications();
 * await notifyAdminNewReport(adminIds, reporterId, reporterName, reportedType, reason);
 */

import { NOTIFICATION_TYPES, notificationTemplates, useSendNotification } from '../hooks/useNotifications';

export const useAdminNotifications = () => {
  const { sendNotif } = useSendNotification();

  /**
   * Notify all admins that a new report has been submitted
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} reporterId - ID of user who submitted the report
   * @param {string} reporterName - Name of user who submitted the report
   * @param {string} reportedUserId - ID of user/content being reported
   * @param {string} reportType - Type of report (user, resource, comment, etc)
   * @param {string} reason - Reason for the report
   */
  const notifyAdminNewReport = async (adminIds, reporterId, reporterName, reportedUserId, reportType, reason) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_NEW_REPORT]?.() || {
      title: '🚩 New Report Submitted',
      body: `${reporterName} reported ${reportType}`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_new_report',
        template.title,
        template.body,
        {
          reporterId,
          reporterName,
          reportedUserId,
          reportType,
          reason,
          actionType: 'admin_new_report',
        }
      ).catch(err => console.warn('Failed to notify admin of report:', err));
    }
  };

  /**
   * Notify all admins that a resource is pending approval
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} uploaderId - ID of resource uploader
   * @param {string} uploaderName - Name of uploader
   * @param {string} resourceTitle - Title of resource
   * @param {string} resourceId - ID of resource
   * @param {string} category - Resource category
   */
  const notifyAdminResourcePending = async (adminIds, uploaderId, uploaderName, resourceTitle, resourceId, category) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_RESOURCE_PENDING]?.() || {
      title: '📚 Resource Pending Approval',
      body: `${uploaderName} uploaded: ${resourceTitle}`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_resource_pending',
        template.title,
        template.body,
        {
          uploaderId,
          uploaderName,
          resourceTitle,
          resourceId,
          category,
          actionType: 'admin_resource_pending',
        }
      ).catch(err => console.warn('Failed to notify admin of pending resource:', err));
    }
  };

  /**
   * Notify all admins of a new teacher verification request
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} teacherId - ID of teacher requesting verification
   * @param {string} teacherName - Name of teacher
   * @param {string} subject - Subject area
   * @param {string} school - School name
   */
  const notifyAdminTeacherVerification = async (adminIds, teacherId, teacherName, subject, school) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_TEACHER_VERIFICATION]?.() || {
      title: '👨‍🏫 Teacher Verification Pending',
      body: `${teacherName} requested teacher verification`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_teacher_verification',
        template.title,
        template.body,
        {
          teacherId,
          teacherName,
          subject,
          school,
          actionType: 'admin_teacher_verification',
        }
      ).catch(err => console.warn('Failed to notify admin of teacher verification:', err));
    }
  };

  /**
   * Notify all admins of a new contact request
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} requesterId - ID of person sending contact request
   * @param {string} requesterName - Name of requester
   * @param {string} email - Email of requester
   * @param {string} subject - Subject of request
   */
  const notifyAdminContactRequest = async (adminIds, requesterId, requesterName, email, subject) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_CONTACT_REQUEST]?.() || {
      title: '💬 New Contact Request',
      body: `${requesterName}: ${subject}`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_contact_request',
        template.title,
        template.body,
        {
          requesterId,
          requesterName,
          email,
          subject,
          actionType: 'admin_contact_request',
        }
      ).catch(err => console.warn('Failed to notify admin of contact request:', err));
    }
  };

  /**
   * Notify all admins of suspicious account activity
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} userId - ID of user with suspicious activity
   * @param {string} userName - Name of user
   * @param {string} activityType - Type of suspicious activity
   * @param {object} details - Additional details
   */
  const notifyAdminSuspiciousActivity = async (adminIds, userId, userName, activityType, details = {}) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_SUSPICIOUS_ACTIVITY]?.() || {
      title: '⚠️ Suspicious Account Activity',
      body: `${userName} - ${activityType}`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_suspicious_activity',
        template.title,
        template.body,
        {
          userId,
          userName,
          activityType,
          details,
          actionType: 'admin_suspicious_activity',
        }
      ).catch(err => console.warn('Failed to notify admin of suspicious activity:', err));
    }
  };

  /**
   * Notify all admins when a resource is flagged multiple times
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} resourceId - ID of flagged resource
   * @param {string} resourceTitle - Title of resource
   * @param {number} flagCount - Number of times flagged
   */
  const notifyAdminResourceFlaggedMultiple = async (adminIds, resourceId, resourceTitle, flagCount) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_RESOURCE_FLAGGED]?.() || {
      title: '🚩 Resource Flagged Multiple Times',
      body: `${resourceTitle} has been flagged ${flagCount} times`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_resource_flagged',
        template.title,
        template.body,
        {
          resourceId,
          resourceTitle,
          flagCount,
          actionType: 'admin_resource_flagged',
        }
      ).catch(err => console.warn('Failed to notify admin of flagged resource:', err));
    }
  };

  /**
   * Notify admins when a user account is reported multiple times
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} userId - ID of reported user
   * @param {string} userName - Name of user
   * @param {number} reportCount - Number of reports
   */
  const notifyAdminUserReportedMultiple = async (adminIds, userId, userName, reportCount) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_USER_REPORTED]?.() || {
      title: '⚠️ User Reported Multiple Times',
      body: `${userName} has been reported ${reportCount} times`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_user_reported',
        template.title,
        template.body,
        {
          userId,
          userName,
          reportCount,
          actionType: 'admin_user_reported',
        }
      ).catch(err => console.warn('Failed to notify admin of user reports:', err));
    }
  };

  /**
   * Notify admin team that a report has been resolved
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} resolvedByName - Name of admin who resolved it
   * @param {string} reportType - Type of report
   * @param {string} resolution - How it was resolved
   */
  const notifyAdminReportResolved = async (adminIds, resolvedByName, reportType, resolution) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_REPORT_RESOLVED]?.() || {
      title: '✅ Report Resolved',
      body: `${reportType} report resolved: ${resolution}`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_report_resolved',
        template.title,
        template.body,
        {
          resolvedByName,
          reportType,
          resolution,
          actionType: 'admin_report_resolved',
        }
      ).catch(err => console.warn('Failed to notify admin of report resolution:', err));
    }
  };

  /**
   * Notify all admins when a comment is reported
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} reporterId - ID of user reporting the comment
   * @param {string} reporterName - Name of reporter
   * @param {string} commentId - ID of reported comment
   * @param {string} commentText - Text of the comment
   * @param {string} resourceId - ID of resource containing comment
   * @param {string} reason - Reason for report
   */
  const notifyAdminCommentReported = async (adminIds, reporterId, reporterName, commentId, commentText, resourceId, reason) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_COMMENT_REPORTED]?.() || {
      title: '💬 Comment Reported',
      body: `${reporterName} reported a comment - ${reason}`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_comment_reported',
        template.title,
        template.body,
        {
          reporterId,
          reporterName,
          commentId,
          commentText,
          resourceId,
          reason,
          actionType: 'admin_comment_reported',
        }
      ).catch(err => console.warn('Failed to notify admin of reported comment:', err));
    }
  };

  /**
   * Notify all admins when a user is reported
   * @param {string[]} adminIds - Array of admin user IDs
   * @param {string} reporterId - ID of user reporting
   * @param {string} reporterName - Name of reporter
   * @param {string} reportedUserId - ID of reported user
   * @param {string} reportedUserName - Name of reported user
   * @param {string} reason - Reason for report
   * @param {string} description - Additional description
   */
  const notifyAdminUserReportedDirect = async (adminIds, reporterId, reporterName, reportedUserId, reportedUserName, reason, description = '') => {
    const template = notificationTemplates[NOTIFICATION_TYPES.ADMIN_USER_REPORTED_DIRECT]?.() || {
      title: '👤 User Reported',
      body: `${reporterName} reported ${reportedUserName} - ${reason}`,
    };

    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_user_reported_direct',
        template.title,
        template.body,
        {
          reporterId,
          reporterName,
          reportedUserId,
          reportedUserName,
          reason,
          description,
          actionType: 'admin_user_reported_direct',
        }
      ).catch(err => console.warn('Failed to notify admin of reported user:', err));
    }
  };

  /**
   * Notify followers when a teacher uploads a new resource
   * @param {string[]} followerIds - Array of follower user IDs
   * @param {string} teacherId - ID of teacher uploading resource
   * @param {string} teacherName - Name of teacher
   * @param {string} resourceTitle - Title of resource
   * @param {string} resourceId - ID of resource
   * @param {string} category - Resource category
   */
  const notifyFollowersResourceUploaded = async (followerIds, teacherId, teacherName, resourceTitle, resourceId, category) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.FOLLOWERS_RESOURCE_UPLOADED]?.() || {
      title: '📚 New Resource',
      body: `${teacherName} uploaded: ${resourceTitle}`,
    };

    for (const followerId of followerIds) {
      await sendNotif(
        followerId,
        'followers_resource_uploaded',
        template.title,
        template.body,
        {
          teacherId,
          teacherName,
          resourceTitle,
          resourceId,
          category,
          actionType: 'followers_resource_uploaded',
        }
      ).catch(err => console.warn('Failed to notify followers:', err));
    }
  };

  return {
    notifyAdminNewReport,
    notifyAdminResourcePending,
    notifyAdminTeacherVerification,
    notifyAdminContactRequest,
    notifyAdminSuspiciousActivity,
    notifyAdminResourceFlaggedMultiple,
    notifyAdminUserReportedMultiple,
    notifyAdminReportResolved,
    notifyAdminCommentReported,
    notifyAdminUserReportedDirect,
    notifyFollowersResourceUploaded,
  };
};
