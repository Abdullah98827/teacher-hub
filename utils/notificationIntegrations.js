import { useSendNotification, NOTIFICATION_TYPES, notificationTemplates } from '../hooks/useNotifications';

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
    });
  };

  const notifyUnfollow = async (targetUserId, userName, userId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.UNFOLLOW](userName);
    await sendNotif(targetUserId, NOTIFICATION_TYPES.UNFOLLOW, template.title, template.body, {
      userId,
      userName,
      actionType: 'unfollow',
    });
  };

  return { notifyFollow, notifyUnfollow };
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
    );
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
    );
  };

  return { notifyComment, notifyCommentReply };
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
    );
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
    );
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
    );
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
    );
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
    );
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
    );
  };

  const notifyVerificationUpdate = async (userId, status) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.VERIFICATION]();
    await sendNotif(
      userId,
      NOTIFICATION_TYPES.VERIFICATION,
      template.title,
      `Your verification status is now: ${status}`,
      { status, actionType: 'verification_update' }
    );
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
    );
  };

  return { notifyMembershipUpdate };
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
    );
  };

  const notifyReportResolved = async (userId, resolution) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.REPORT_RESOLVED]();
    await sendNotif(
      userId,
      NOTIFICATION_TYPES.REPORT_RESOLVED,
      template.title,
      `${template.body} - ${resolution}`,
      { resolution, actionType: 'report_resolved' }
    );
  };

  return { notifyReportReceived, notifyReportResolved };
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
    );
  };

  const notifyContactRequestAccepted = async (requesterUserId, accepterName, accepterId) => {
    const template = notificationTemplates[NOTIFICATION_TYPES.CONTACT_REQUEST_ACCEPTED](accepterName);
    await sendNotif(
      requesterUserId,
      NOTIFICATION_TYPES.CONTACT_REQUEST_ACCEPTED,
      template.title,
      template.body,
      { accepterId, accepterName, actionType: 'contact_request_accepted' }
    );
  };

  return { notifyContactRequest, notifyContactRequestAccepted };
};
