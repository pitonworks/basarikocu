const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Goals API
  async getGoals(categoryId = null, status = null) {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (status) params.append('status', status);
    
    const queryString = params.toString();
    const endpoint = `/api/goals${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async createGoal(goalData) {
    return this.request('/api/goals', {
      method: 'POST',
      body: goalData,
    });
  }

  async updateGoal(goalId, updateData) {
    return this.request(`/api/goals/${goalId}`, {
      method: 'PUT',
      body: updateData,
    });
  }

  async deleteGoal(goalId) {
    return this.request(`/api/goals/${goalId}`, {
      method: 'DELETE',
    });
  }

  async getGoal(goalId) {
    return this.request(`/api/goals/${goalId}`);
  }

  // Categories API
  async getCategories() {
    return this.request('/api/categories');
  }

  async createCategory(categoryData) {
    return this.request('/api/categories', {
      method: 'POST',
      body: categoryData,
    });
  }

  async deleteCategory(categoryId) {
    return this.request(`/api/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Progress API
  async getGoalProgress(goalId) {
    return this.request(`/api/goals/${goalId}/progress`);
  }

  async updateStepProgress(goalId, progressData) {
    return this.request(`/api/goals/${goalId}/progress`, {
      method: 'POST',
      body: progressData,
    });
  }

  // Statistics API
  async getStats() {
    return this.request('/api/stats');
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }
}

export default new ApiService();