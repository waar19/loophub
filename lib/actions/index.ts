/**
 * Server Actions Index
 * Centraliza todas las server actions de la aplicación
 */

// Thread actions
export {
  createThread,
  updateThread,
  deleteThread,
  voteThread,
} from './threads';

// Comment actions
export {
  createComment,
  updateComment,
  deleteComment,
  voteComment,
} from './comments';

// User actions
export {
  updateProfile,
  updateNotificationSettings,
  changeUsername,
  toggleBookmark,
  toggleSubscription,
  reportContent,
} from './user';

// Poll actions
export {
  createPoll,
  votePoll,
  getPollResults,
  closePoll,
  deletePoll,
} from './polls';
