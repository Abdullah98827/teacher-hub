/**
 * TESTING UTILITIES
 * Use these to test notifications during development
 * 
 * Usage:
 * import { sendTestNotification, simulateUserAction } from '../utils/notificationTesting';
 * 
 * await sendTestNotification('Test Title', 'Test Body');
 * await simulateUserAction('follow', userId, userName);
 */

import {
  sendLocalNotification,
  createNotification,
} from './notificationService';
import {
  useFollowNotifications,
  useCommentNotifications,
  useRatingNotifications,
  useMessageNotifications,
  useResourceNotifications,
} from './notificationIntegrations';

/**
 * Send a test notification locally
 */
export const sendTestNotification = async (title = 'Test Notification', body = 'This is a test') => {
  try {
    await sendLocalNotification(title, body, {
      test: true,
      timestamp: new Date().toISOString(),
    });
    console.log('✅ Test notification sent:', title);
    return true;
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    return false;
  }
};

/**
 * Simulate different user actions for testing
 */
export const simulateUserAction = async (actionType, userId, userName = 'Test User', additionalData = {}) => {
  try {
    console.log(`🧪 Simulating ${actionType} action for user:`, userId);

    switch (actionType) {
      case 'follow':
        const { notifyFollow: follow } = useFollowNotifications();
        await follow(userId, userName, 'test-follower-id');
        console.log('✅ Follow notification simulated');
        break;

      case 'comment':
        const { notifyComment } = useCommentNotifications();
        await notifyComment(
          userId,
          userName,
          'test-commenter-id',
          'test-resource-id',
          additionalData.resourceTitle || 'Test Resource'
        );
        console.log('✅ Comment notification simulated');
        break;

      case 'comment_reply':
        const { notifyCommentReply } = useCommentNotifications();
        await notifyCommentReply(userId, userName, 'test-replier-id', 'test-comment-id', 'test-resource-id');
        console.log('✅ Comment reply notification simulated');
        break;

      case 'rating':
        const { notifyRating } = useRatingNotifications();
        await notifyRating(
          userId,
          userName,
          'test-rater-id',
          'test-resource-id',
          additionalData.stars || 5,
          additionalData.resourceTitle || 'Test Resource'
        );
        console.log('✅ Rating notification simulated');
        break;

      case 'message':
        const { notifyDirectMessage } = useMessageNotifications();
        await notifyDirectMessage(
          userId,
          userName,
          'test-sender-id',
          'This is a test message preview',
          'test-chat-id'
        );
        console.log('✅ Direct message notification simulated');
        break;

      case 'group_message':
        const { notifyGroupMessage } = useMessageNotifications();
        await notifyGroupMessage(
          userId,
          additionalData.groupName || 'Test Group',
          userName,
          'test-sender-id',
          'This is a test group message',
          'test-group-id'
        );
        console.log('✅ Group message notification simulated');
        break;

      case 'resource_upload':
        const { notifyResourceUpload } = useResourceNotifications();
        await notifyResourceUpload(
          userId,
          userName,
          'test-uploader-id',
          additionalData.resourceTitle || 'Test Resource',
          'test-resource-id',
          additionalData.subject || 'Mathematics'
        );
        console.log('✅ Resource upload notification simulated');
        break;

      case 'resource_favorite':
        const { notifyResourceFavorite } = useResourceNotifications();
        await notifyResourceFavorite(
          userId,
          userName,
          'test-favoriter-id',
          additionalData.resourceTitle || 'Test Resource',
          'test-resource-id'
        );
        console.log('✅ Resource favorite notification simulated');
        break;

      default:
        console.warn('❌ Unknown action type:', actionType);
        return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Error simulating ${actionType}:`, error);
    return false;
  }
};

/**
 * Create a raw notification in the database (for testing)
 */
export const createTestNotification = async (userId, type, title, body, data = {}) => {
  try {
    const notification = await createNotification(userId, type, title, body, data);
    console.log('✅ Test notification created:', notification);
    return notification;
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    return null;
  }
};

/**
 * Test notification templates
 * Shows what each notification type looks like
 */
export const testNotificationTemplates = async (userId) => {
  const templates = [
    { type: 'follow', title: 'New Follower', body: 'John Doe started following you' },
    { type: 'comment', title: 'New Comment', body: 'Jane Smith commented on "React Guide"' },
    { type: 'comment_reply', title: 'New Reply', body: 'Mike Brown replied to your comment' },
    { type: 'rating', title: 'New Rating', body: 'Sarah Wilson gave you 5 stars' },
    { type: 'message', title: 'New Message', body: 'Tom sent you a message' },
    { type: 'group_message', title: 'Message in Study Group', body: 'Alice posted in the chat' },
    { type: 'resource_upload', title: 'New Resource', body: 'Bob uploaded "Python Basics"' },
    { type: 'resource_favorite', title: 'Favorite Added', body: 'Carol added your resource to favorites' },
    { type: 'verification', title: 'Verification Updated', body: 'Your teacher verification status has been updated' },
    { type: 'membership', title: 'Membership Updated', body: 'Your membership has been upgraded to Premium' },
    { type: 'teacher_approved', title: 'Teacher Verified', body: 'Congratulations! Your teacher verification has been approved' },
  ];

  console.log('📧 Testing notification templates...');

  for (const template of templates) {
    try {
      await createTestNotification(userId, template.type, template.title, template.body, {
        isTest: true,
      });
      console.log(`✅ ${template.type}: ${template.title}`);
    } catch (error) {
      console.error(`❌ ${template.type}:`, error);
    }
  }

  console.log('✅ All templates tested!');
};

/**
 * Comprehensive test suite
 * Run this to test the entire notification system
 */
export const runNotificationTestSuite = async (userId, userName = 'Test User') => {
  console.log('\n🧪 STARTING NOTIFICATION TEST SUITE\n');
  console.log('User ID:', userId);
  console.log('User Name:', userName);
  console.log('\n-------------------------------------------\n');

  const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Local notification
  console.log('Test 1: Local Notification');
  const localTest = await sendTestNotification('Test 1', 'Local notification test');
  testResults.tests.push({
    name: 'Local Notification',
    passed: localTest,
  });
  if (localTest) testResults.passed++;
  else testResults.failed++;

  // Test 2: Follow action
  console.log('\nTest 2: Follow Action');
  const followTest = await simulateUserAction('follow', userId, userName);
  testResults.tests.push({
    name: 'Follow Notification',
    passed: followTest,
  });
  if (followTest) testResults.passed++;
  else testResults.failed++;

  // Test 3: Comment action
  console.log('\nTest 3: Comment Action');
  const commentTest = await simulateUserAction('comment', userId, userName, {
    resourceTitle: 'Test Learning Guide',
  });
  testResults.tests.push({
    name: 'Comment Notification',
    passed: commentTest,
  });
  if (commentTest) testResults.passed++;
  else testResults.failed++;

  // Test 4: Message action
  console.log('\nTest 4: Message Action');
  const messageTest = await simulateUserAction('message', userId, userName);
  testResults.tests.push({
    name: 'Message Notification',
    passed: messageTest,
  });
  if (messageTest) testResults.passed++;
  else testResults.failed++;

  // Test 5: Rating action
  console.log('\nTest 5: Rating Action');
  const ratingTest = await simulateUserAction('rating', userId, userName, {
    stars: 5,
    resourceTitle: 'Great Resource',
  });
  testResults.tests.push({
    name: 'Rating Notification',
    passed: ratingTest,
  });
  if (ratingTest) testResults.passed++;
  else testResults.failed++;

  // Test 6: Resource upload
  console.log('\nTest 6: Resource Upload Action');
  const uploadTest = await simulateUserAction('resource_upload', userId, userName, {
    resourceTitle: 'New Math Lesson',
    subject: 'Mathematics',
  });
  testResults.tests.push({
    name: 'Resource Upload Notification',
    passed: uploadTest,
  });
  if (uploadTest) testResults.passed++;
  else testResults.failed++;

  // Summary
  console.log('\n-------------------------------------------\n');
  console.log('📊 TEST SUMMARY\n');
  testResults.tests.forEach((test) => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
  });
  console.log(`\n✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(0)}%\n`);

  return testResults;
};

/**
 * Test a specific notification type with custom data
 */
export const testCustomNotification = async (userId, type, customData = {}) => {
  try {
    console.log(`\n🧪 Testing custom ${type} notification...`);

    // Default data structure based on type
    const defaultData = {
      follow: {
        followerId: 'test-follower-id',
        followerName: 'Test Follower',
        actionType: 'follow',
      },
      comment: {
        commenterId: 'test-commenter-id',
        resourceId: 'test-resource-id',
        resourceTitle: 'Test Resource',
        actionType: 'comment',
      },
      message: {
        senderId: 'test-sender-id',
        chatId: 'test-chat-id',
        messagePreview: 'Test message preview',
        actionType: 'message',
      },
      // Add more as needed
    };

    const data = { ...defaultData[type], ...customData };

    // Define titles and bodies for each type
    const templates = {
      follow: {
        title: 'New Follower',
        body: `${customData.followerName || 'User'} started following you`,
      },
      comment: {
        title: 'New Comment',
        body: `New comment on "${customData.resourceTitle || 'Your Resource'}"`,
      },
      message: {
        title: 'New Message',
        body: customData.messagePreview || 'You have a new message',
      },
    };

    const template = templates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const notification = await createTestNotification(
      userId,
      type,
      template.title,
      template.body,
      data
    );

    console.log('✅ Custom notification test successful');
    return notification;
  } catch (error) {
    console.error('❌ Custom notification test failed:', error);
    return null;
  }
};
