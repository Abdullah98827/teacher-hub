import { NOTIFICATION_TYPES, notificationTemplates, useSendNotification } from '../hooks/useNotifications';

/**
 * Integration helpers to send notifications when specific actions occur
 * These can be called from anywhere in the app
 */

export const useFollowNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyFollow = async (targetUserId, followerName, followerId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.FOLLOW](followerName);
    await sendNotif(targetUserId, NOTIFICATION_TYPES.FOLLOW, template.title, template.body, {
      followerId,
      followerName,
      actionType: 'follow',
    }).catch(err => console.warn('Failed to notify follow:', err));
  };

  const notifyUnfollow = async (targetUserId, userName, userId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.UNFOLLOW](userName);
    await sendNotif(targetUserId, NOTIFICATION_TYPES.UNFOLLOW, template.title, template.body, {
      userId,
      userName,
      actionType: 'unfollow',
    }).catch(err => console.warn('Failed to notify unfollow:', err));
  };

  const notifyFollowBack = async (userId, followerName, followerId) => {
    const template = {
      title: '👥 Follow Back',
      body: `${followerName} followed you back!`,
    };
    await sendNotif(
      userId,
      'follow_back',
      template.title,
      template.body,
      {
        followerId,
        followerName,
        actionType: 'follow_back',
      }
    ).catch(err => console.warn('Failed to notify follow back:', err));
  };

  return { notifyFollow, notifyUnfollow, notifyFollowBack };
};

export const useCommentNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyComment = async (resourceOwnerId, commenterName, commenterId, resourceId, resourceTitle) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.COMMENT](commenterName, resourceTitle);
    await sendNotif(
      resourceOwnerId,
      NOTIFICATION_TYPES.COMMENT,
      template.title,
      template.body,
      {
        commenterId,
        commenterName,
        resourceId,
        resourceTitle,
        actionType: 'comment',
      }
    ).catch(err => console.warn('Failed to notify comment:', err));
  };

  const notifyCommentReply = async (commentOwnerId, replierName, replierId, commentId, resourceId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.COMMENT_REPLY](replierName);
    await sendNotif(
      commentOwnerId,
      NOTIFICATION_TYPES.COMMENT_REPLY,
      template.title,
      template.body,
      {
        replierId,
        replierName,
        commentId,
        resourceId,
        actionType: 'comment_reply',
      }
    ).catch(err => console.warn('Failed to notify comment reply:', err));
  };

  const notifyCommentThread = async (resourceOwnerId, commenters, newCommenterName, newCommenterId, resourceId, resourceTitle) => {
    const uniqueCommenters = [...new Set(commenters)].filter(
      (id) => id !== resourceOwnerId && id !== newCommenterId
    );

    for (const commenterId of uniqueCommenters) {
      const template = notificationTemplates[NOTIFICATION_TYPES.COMMENT](newCommenterName, resourceTitle);
      await sendNotif(
        commenterId,
        NOTIFICATION_TYPES.COMMENT,
        template.title,
        template.body,
        {
          commenterId: newCommenterId,
          commenterName: newCommenterName,
          resourceId,
          resourceTitle,
          actionType: 'comment_thread',
        }
      ).catch(err => console.warn('Failed to notify comment thread:', err));
    }
  };

  return { notifyComment, notifyCommentReply, notifyCommentThread };
};

export const useRatingNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyRating = async (resourceOwnerId, raterName, raterId, resourceId, stars, resourceTitle) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.RATING](raterName, stars);
    await sendNotif(
      resourceOwnerId,
      NOTIFICATION_TYPES.RATING,
      template.title,
      template.body,
      {
        raterId,
        raterName,
        resourceId,
        resourceTitle,
        stars,
        actionType: 'rating',
      }
    ).catch(err => console.warn('Failed to notify rating:', err));
  };

  return { notifyRating };
};

export const useMessageNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyDirectMessage = async (receiverId, senderName, senderId, messagePreview, chatId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.MESSAGE](senderName);
    await sendNotif(
      receiverId,
      NOTIFICATION_TYPES.MESSAGE,
      template.title,
      template.body,
      {
        senderId,
        senderName,
        messagePreview,
        chatId,
        actionType: 'message',
      }
    ).catch(err => console.warn('Failed to notify direct message:', err));
  };

  const notifyGroupMessage = async (groupMemberId, groupName, senderName, senderId, messagePreview, groupId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.GROUP_MESSAGE](groupName, senderName);
    await sendNotif(
      groupMemberId,
      NOTIFICATION_TYPES.GROUP_MESSAGE,
      template.title,
      template.body,
      {
        senderId,
        senderName,
        messagePreview,
        groupId,
        groupName,
        actionType: 'group_message',
      }
    ).catch(err => console.warn('Failed to notify group message:', err));
  };

  return { notifyDirectMessage, notifyGroupMessage };
};

export const useResourceNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyResourceUpload = async (subscriberId, uploaderName, uploaderId, resourceTitle, resourceId, subject) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.RESOURCE_UPLOAD](uploaderName, resourceTitle);
    await sendNotif(
      subscriberId,
      NOTIFICATION_TYPES.RESOURCE_UPLOAD,
      template.title,
      template.body,
      {
        uploaderId,
        uploaderName,
        resourceTitle,
        resourceId,
        subject,
        actionType: 'resource_upload',
      }
    ).catch(err => console.warn('Failed to notify resource upload:', err));
  };

  const notifyResourceFavorite = async (resourceOwnerId, favoriterName, favoriterId, resourceTitle, resourceId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.RESOURCE_FAVORITE](favoriterName, resourceTitle);
    await sendNotif(
      resourceOwnerId,
      NOTIFICATION_TYPES.RESOURCE_FAVORITE,
      template.title,
      template.body,
      {
        favoriterId,
        favoriterName,
        resourceTitle,
        resourceId,
        actionType: 'resource_favorite',
      }
    ).catch(err => console.warn('Failed to notify resource favorite:', err));
  };

  return { notifyResourceUpload, notifyResourceFavorite };
};

export const useVerificationNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyTeacherApproved = async (userId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.TEACHER_APPROVED]();
    await sendNotif(
      userId,
      NOTIFICATION_TYPES.TEACHER_APPROVED,
      template.title,
      template.body,
      { actionType: 'teacher_approved' }
    ).catch(err => console.warn('Failed to notify teacher approved:', err));
  };

  const notifyVerificationUpdate = async (userId, status) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.VERIFICATION]();
    await sendNotif(
      userId,
      NOTIFICATION_TYPES.VERIFICATION,
      template.title,
      `Your verification status is now: ${status}`,
      { status, actionType: 'verification_update' }
    ).catch(err => console.warn('Failed to notify verification update:', err));
  };

  return { notifyTeacherApproved, notifyVerificationUpdate };
};

export const useMembershipNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyMembershipUpdate = async (userId, plan, features) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.MEMBERSHIP](plan);
    await sendNotif(
      userId,
      NOTIFICATION_TYPES.MEMBERSHIP,
      template.title,
      template.body,
      { plan, features, actionType: 'membership_update' }
    ).catch(err => console.warn('Failed to notify membership update:', err));
  };

  const notifyMembershipExpiring = async (userId, daysLeft) => {
    const template = {
      title: 'Membership Expiring Soon',
      body: `Your membership expires in ${daysLeft} days. Renew to keep access.`,
    };
    await sendNotif(
      userId,
      'membership_expiring',
      template.title,
      template.body,
      { daysLeft, actionType: 'membership_expiring' }
    ).catch(err => console.warn('Failed to notify membership expiring:', err));
  };

  const notifyMembershipExpired = async (userId) => {
    const template = {
      title: 'Membership Expired',
      body: 'Your membership has expired. Renew to continue accessing resources.',
    };
    await sendNotif(
      userId,
      'membership_expired',
      template.title,
      template.body,
      { actionType: 'membership_expired' }
    ).catch(err => console.warn('Failed to notify membership expired:', err));
  };

  return { notifyMembershipUpdate, notifyMembershipExpiring, notifyMembershipExpired };
};

export const useReportNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyReportReceived = async (userId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.REPORT]();
    await sendNotif(
      userId,
      NOTIFICATION_TYPES.REPORT,
      template.title,
      template.body,
      { actionType: 'report_received' }
    ).catch(err => console.warn('Failed to notify report received:', err));
  };

  const notifyReportResolved = async (userId, resolution) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.REPORT_RESOLVED]();
    await sendNotif(
      userId,
      NOTIFICATION_TYPES.REPORT_RESOLVED,
      template.title,
      `${template.body} - ${resolution}`,
      { resolution, actionType: 'report_resolved' }
    ).catch(err => console.warn('Failed to notify report resolved:', err));
  };

  const notifyCommentReportResolved = async (reporterId, resourceTitle, status) => {
    const isApproved = status === 'resolved' || status === 'approved';
    const template = {
      title: isApproved ? 'Report Approved' : 'Report Dismissed',
      body: isApproved
        ? `Your report on "${resourceTitle}" has been approved. The comment has been removed.`
        : `Your report on "${resourceTitle}" has been reviewed and dismissed.`,
    };
    await sendNotif(
      reporterId,
      'comment_report_resolved',
      template.title,
      template.body,
      { resourceTitle, status, actionType: 'comment_report_resolved' }
    ).catch(err => console.warn('Failed to notify comment report resolution:', err));
  };

  const notifyGroupChatReportResolved = async (reporterId, groupChatName, status) => {
    const isApproved = status === 'resolved' || status === 'approved';
    const template = {
      title: isApproved ? 'Report Approved' : 'Report Dismissed',
      body: isApproved
        ? `Your report on "${groupChatName}" has been approved.`
        : `Your report on "${groupChatName}" has been reviewed and dismissed.`,
    };
    await sendNotif(
      reporterId,
      'group_chat_report_resolved',
      template.title,
      template.body,
      { groupChatName, status, actionType: 'group_chat_report_resolved' }
    ).catch(err => console.warn('Failed to notify group chat report resolution:', err));
  };

  return { notifyReportReceived, notifyReportResolved, notifyCommentReportResolved, notifyGroupChatReportResolved };
};

export const useContactNotifications = () => {
  const { sendNotif } = useSendNotification();

  const notifyContactRequest = async (targetUserId, requesterName, requesterId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.CONTACT_REQUEST](requesterName);
    await sendNotif(
      targetUserId,
      NOTIFICATION_TYPES.CONTACT_REQUEST,
      template.title,
      template.body,
      { requesterId, requesterName, actionType: 'contact_request' }
    ).catch(err => console.warn('Failed to notify contact request:', err));
  };

  const notifyContactRequestAccepted = async (requesterUserId, accepterName, accepterId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.CONTACT_REQUEST_ACCEPTED](accepterName);
    await sendNotif(
      requesterUserId,
      NOTIFICATION_TYPES.CONTACT_REQUEST_ACCEPTED,
      template.title,
      template.body,
      { accepterId, accepterName, actionType: 'contact_request_accepted' }
    ).catch(err => console.warn('Failed to notify contact request accepted:', err));
  };

  const notifyContactRequestRejected = async (requesterUserId, rejecterName, rejectedId) => {
    const template = {
      title: 'Contact Request Declined',
      body: `${rejecterName} declined your contact request`,
    };
    await sendNotif(
      requesterUserId,
      'contact_request_rejected',
      template.title,
      template.body,
      { rejectedId, rejecterName, actionType: 'contact_request_rejected' }
    ).catch(err => console.warn('Failed to notify contact request rejection:', err));
  };

  return { notifyContactRequest, notifyContactRequestAccepted, notifyContactRequestRejected };
};