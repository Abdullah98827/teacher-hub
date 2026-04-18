/**
 * Admin Notification Integration Hooks
 * For notifying admins of system events and actions requiring admin review
 * 
 * Usage:
 * const { notifyAdminNewReport } = useAdminNotifications();
 * await notifyAdminNewReport(adminIds, reporterId, reporterName, reportedType, reason);
 */

import { useSendNotification } from '../hooks/useNotifications';

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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_new_report',
        'New Report Submitted',
        `${reporterName} reported ${reportType}`,
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_resource_pending',
        'Resource Pending Approval',
        `${uploaderName} uploaded: ${resourceTitle}`,
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_teacher_verification',
        'Teacher Verification Pending',
        `${teacherName} requested teacher verification`,
        {
          teacherId,
          teacherName,
          subject,
          school,
          actionType: 'admin_teacher_verification',
        }
      ).catch(err => console.warn('Failed to notify admin of verification request:', err));
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_contact_request',
        'New Contact Request',
        `${requesterName}: ${subject}`,
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_suspicious_activity',
        'Suspicious Account Activity',
        `${userName} - ${activityType}`,
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_resource_flagged',
        'Resource Flagged Multiple Times',
        `${resourceTitle} has been flagged ${flagCount} times`,
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_user_reported',
        '⚠️ User Reported Multiple Times',
        `${userName} has been reported ${reportCount} times`,
        {
          userId,
          userName,
          reportCount,
          actionType: 'admin_user_reported',
        }
      ).catch(err => console.warn('Failed to notify admin of multiple user reports:', err));
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_report_resolved',
        'Report Resolved',
        `${reportType} report resolved: ${resolution}`,
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_comment_reported',
        'Comment Reported',
        `${reporterName} reported a comment - ${reason}`,
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
    if (!adminIds || adminIds.length === 0) return;
    
    for (const adminId of adminIds) {
      await sendNotif(
        adminId,
        'admin_user_reported_direct',
        '👤 User Reported',
        `${reporterName} reported ${reportedUserName} - ${reason}`,
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
    if (!followerIds || followerIds.length === 0) return;
    
    for (const followerId of followerIds) {
      await sendNotif(
        followerId,
        'followers_resource_uploaded',
        'New Resource',
        `${teacherName} uploaded: ${resourceTitle}`,
        {
          teacherId,
          teacherName,
          resourceTitle,
          resourceId,
          category,
          actionType: 'followers_resource_uploaded',
        }
      ).catch(err => console.warn('Failed to notify follower of resource upload:', err));
    }
  };

  /**
   * Notify resource uploader when their resource is approved
   * @param {string} uploaderId - ID of resource uploader
   * @param {string} resourceTitle - Title of resource
   * @param {string} resourceId - ID of resource
   */
  const notifyResourceApproved = async (uploaderId, resourceTitle, resourceId) => {
    await sendNotif(
      uploaderId,
      'resource_approved',
      'Resource Approved!',
      `Your resource "${resourceTitle}" has been approved and is now live`,
      {
        resourceTitle,
        resourceId,
        status: 'approved',
        actionType: 'resource_approved',
      }
    ).catch(err => console.warn('Failed to notify uploader of resource approval:', err));
  };

  /**
   * Notify resource uploader when their resource is rejected
   * @param {string} uploaderId - ID of resource uploader
   * @param {string} resourceTitle - Title of resource
   * @param {string} resourceId - ID of resource
   * @param {string} rejectionReason - Reason for rejection
   */
  const notifyResourceRejected = async (uploaderId, resourceTitle, resourceId, rejectionReason = '') => {
    await sendNotif(
      uploaderId,
      'resource_rejected',
      'Resource Not Approved',
      `Your resource "${resourceTitle}" needs revision${rejectionReason ? ': ' + rejectionReason : ''}`,
      {
        resourceTitle,
        resourceId,
        status: 'rejected',
        rejectionReason,
        actionType: 'resource_rejected',
      }
    ).catch(err => console.warn('Failed to notify uploader of resource rejection:', err));
  };

  /**
   * Notify teacher when their verification is approved
   * @param {string} teacherId - ID of teacher
   */
  const notifyTeacherVerificationApproved = async (teacherId) => {
    await sendNotif(
      teacherId,
      'teacher_verification_approved',
      'Verified Teacher',
      'Congratulations! Your teacher verification has been approved',
      {
        status: 'approved',
        actionType: 'teacher_verification_approved',
      }
    ).catch(err => console.warn('Failed to notify teacher of verification approval:', err));
  };

  /**
   * Notify teacher when their verification is rejected
   * @param {string} teacherId - ID of teacher
   * @param {string} rejectionReason - Reason for rejection
   */
  const notifyTeacherVerificationRejected = async (teacherId, rejectionReason = '') => {
    await sendNotif(
      teacherId,
      'teacher_verification_rejected',
      'Verification Request Needs Revision',
      `Your teacher verification request needs additional information${rejectionReason ? ': ' + rejectionReason : ''}`,
      {
        status: 'rejected',
        rejectionReason,
        actionType: 'teacher_verification_rejected',
      }
    ).catch(err => console.warn('Failed to notify teacher of verification rejection:', err));
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
    notifyResourceApproved,
    notifyResourceRejected,
    notifyTeacherVerificationApproved,
    notifyTeacherVerificationRejected,
  };
};