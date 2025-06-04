const API_BASE_URL = "http://172.20.10.3:3000";

export default {
  SOCIAL_AUTH: `${API_BASE_URL}/auth/social-auth`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  UPDATE_PROFILE: `${API_BASE_URL}/user/updateProfile`,
  UPDATE_GOAL: `${API_BASE_URL}/user/updateGoal`,
  UPDATE_PROFILE_DETAILS: `${API_BASE_URL}/user/updateProfileDetails`,
  UPDATE_TRANSFORMATION: `${API_BASE_URL}/user/updateTransformation`,
  UPDATE_DIETARY_PREFERENCES: `${API_BASE_URL}/user/updateDietaryPreferences`,
  UPDATE_ACTIVITY_LEVEL: `${API_BASE_URL}/user/updateActivityLevel`,
};
