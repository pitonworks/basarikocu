#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for AI Goal Coach
Tests all FastAPI endpoints with realistic data
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Optional

# Backend URL from frontend/.env
BACKEND_URL = "http://localhost:8001"
API_BASE = f"{BACKEND_URL}/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.created_categories = []
        self.created_goals = []
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, response_data: Optional[Dict] = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_test("Health Check", True, "Health endpoint working correctly", data)
                    return True
                else:
                    self.log_test("Health Check", False, "Invalid health response format", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_categories_crud(self):
        """Test Categories CRUD operations"""
        success_count = 0
        
        # Test GET empty categories
        try:
            response = self.session.get(f"{API_BASE}/categories")
            if response.status_code == 200:
                categories = response.json()
                self.log_test("Get Categories (Empty)", True, f"Retrieved {len(categories)} categories", {"count": len(categories)})
                success_count += 1
            else:
                self.log_test("Get Categories (Empty)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Categories (Empty)", False, f"Error: {str(e)}")
        
        # Test CREATE categories
        test_categories = [
            {"name": "Kişisel Gelişim", "description": "Kişisel beceri ve yetenekleri geliştirme", "color": "#10b981"},
            {"name": "Kariyer", "description": "Profesyonel hedefler ve kariyer gelişimi", "color": "#3b82f6"},
            {"name": "Sağlık ve Fitness", "description": "Fiziksel ve mental sağlık hedefleri", "color": "#ef4444"},
            {"name": "Eğitim", "description": "Öğrenme ve akademik hedefler", "color": "#8b5cf6"}
        ]
        
        for category_data in test_categories:
            try:
                response = self.session.post(f"{API_BASE}/categories", json=category_data)
                if response.status_code == 200:
                    created_category = response.json()
                    self.created_categories.append(created_category)
                    self.log_test(f"Create Category: {category_data['name']}", True, "Category created successfully", created_category)
                    success_count += 1
                else:
                    self.log_test(f"Create Category: {category_data['name']}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"Create Category: {category_data['name']}", False, f"Error: {str(e)}")
        
        # Test GET categories after creation
        try:
            response = self.session.get(f"{API_BASE}/categories")
            if response.status_code == 200:
                categories = response.json()
                self.log_test("Get Categories (After Creation)", True, f"Retrieved {len(categories)} categories", {"count": len(categories)})
                success_count += 1
            else:
                self.log_test("Get Categories (After Creation)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Categories (After Creation)", False, f"Error: {str(e)}")
        
        # Test DELETE category (delete the last one)
        if self.created_categories:
            category_to_delete = self.created_categories[-1]
            try:
                response = self.session.delete(f"{API_BASE}/categories/{category_to_delete['id']}")
                if response.status_code == 200:
                    self.log_test("Delete Category", True, "Category deleted successfully", response.json())
                    self.created_categories.pop()  # Remove from our list
                    success_count += 1
                else:
                    self.log_test("Delete Category", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("Delete Category", False, f"Error: {str(e)}")
        
        return success_count >= 4  # At least 4 out of 6 tests should pass
    
    def test_goals_crud(self):
        """Test Goals CRUD operations"""
        success_count = 0
        
        # Test GET empty goals
        try:
            response = self.session.get(f"{API_BASE}/goals")
            if response.status_code == 200:
                goals = response.json()
                self.log_test("Get Goals (Empty)", True, f"Retrieved {len(goals)} goals", {"count": len(goals)})
                success_count += 1
            else:
                self.log_test("Get Goals (Empty)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Goals (Empty)", False, f"Error: {str(e)}")
        
        # Test CREATE goals
        category_id = self.created_categories[0]["id"] if self.created_categories else None
        test_goals = [
            {
                "description": "Python programlama dilinde uzmanlaşmak",
                "category_id": category_id,
                "tags": ["programlama", "python", "teknoloji"],
                "priority": "high"
            },
            {
                "description": "Haftada 3 kez spor yapmak",
                "category_id": self.created_categories[2]["id"] if len(self.created_categories) > 2 else None,
                "tags": ["sağlık", "spor", "rutin"],
                "priority": "medium"
            },
            {
                "description": "Yeni bir dil öğrenmek (İspanyolca)",
                "category_id": self.created_categories[1]["id"] if len(self.created_categories) > 1 else None,
                "tags": ["dil", "öğrenme", "kültür"],
                "priority": "low"
            }
        ]
        
        for goal_data in test_goals:
            try:
                response = self.session.post(f"{API_BASE}/goals", json=goal_data)
                if response.status_code == 200:
                    created_goal = response.json()
                    self.created_goals.append(created_goal)
                    self.log_test(f"Create Goal: {goal_data['description'][:30]}...", True, "Goal created successfully", created_goal)
                    success_count += 1
                else:
                    self.log_test(f"Create Goal: {goal_data['description'][:30]}...", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"Create Goal: {goal_data['description'][:30]}...", False, f"Error: {str(e)}")
        
        # Test GET specific goal
        if self.created_goals:
            goal_id = self.created_goals[0]["id"]
            try:
                response = self.session.get(f"{API_BASE}/goals/{goal_id}")
                if response.status_code == 200:
                    goal = response.json()
                    self.log_test("Get Specific Goal", True, "Goal retrieved successfully", goal)
                    success_count += 1
                else:
                    self.log_test("Get Specific Goal", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("Get Specific Goal", False, f"Error: {str(e)}")
        
        # Test UPDATE goal (add steps and resources)
        if self.created_goals:
            goal_id = self.created_goals[0]["id"]
            update_data = {
                "steps": [
                    "Python temellerini öğren",
                    "Veri yapıları ve algoritmalar çalış",
                    "Web framework'leri öğren (Django/Flask)",
                    "Proje geliştir",
                    "Açık kaynak projelere katkıda bulun"
                ],
                "resources": [
                    {"type": "book", "title": "Python Crash Course", "url": "https://example.com"},
                    {"type": "course", "title": "Python for Everybody", "url": "https://coursera.org"},
                    {"type": "website", "title": "Python.org", "url": "https://python.org"}
                ]
            }
            try:
                response = self.session.put(f"{API_BASE}/goals/{goal_id}", json=update_data)
                if response.status_code == 200:
                    updated_goal = response.json()
                    self.log_test("Update Goal (Add Steps)", True, "Goal updated with steps and resources", updated_goal)
                    success_count += 1
                else:
                    self.log_test("Update Goal (Add Steps)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("Update Goal (Add Steps)", False, f"Error: {str(e)}")
        
        # Test GET goals with filters
        if self.created_categories:
            category_id = self.created_categories[0]["id"]
            try:
                response = self.session.get(f"{API_BASE}/goals?category_id={category_id}")
                if response.status_code == 200:
                    filtered_goals = response.json()
                    self.log_test("Get Goals (Filter by Category)", True, f"Retrieved {len(filtered_goals)} goals for category", {"count": len(filtered_goals)})
                    success_count += 1
                else:
                    self.log_test("Get Goals (Filter by Category)", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("Get Goals (Filter by Category)", False, f"Error: {str(e)}")
        
        # Test GET goals with status filter
        try:
            response = self.session.get(f"{API_BASE}/goals?status=active")
            if response.status_code == 200:
                active_goals = response.json()
                self.log_test("Get Goals (Filter by Status)", True, f"Retrieved {len(active_goals)} active goals", {"count": len(active_goals)})
                success_count += 1
            else:
                self.log_test("Get Goals (Filter by Status)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Goals (Filter by Status)", False, f"Error: {str(e)}")
        
        return success_count >= 5  # At least 5 out of 7 tests should pass
    
    def test_progress_tracking(self):
        """Test Progress Tracking functionality"""
        success_count = 0
        
        if not self.created_goals:
            self.log_test("Progress Tracking", False, "No goals available for progress testing")
            return False
        
        goal_id = self.created_goals[0]["id"]
        
        # Test GET progress (should be empty initially)
        try:
            response = self.session.get(f"{API_BASE}/goals/{goal_id}/progress")
            if response.status_code == 200:
                progress_list = response.json()
                self.log_test("Get Goal Progress (Empty)", True, f"Retrieved {len(progress_list)} progress records", {"count": len(progress_list)})
                success_count += 1
            else:
                self.log_test("Get Goal Progress (Empty)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Goal Progress (Empty)", False, f"Error: {str(e)}")
        
        # Test UPDATE progress for steps
        progress_updates = [
            {"step_index": 0, "completed": True, "notes": "Python temellerini tamamladım"},
            {"step_index": 1, "completed": True, "notes": "Veri yapıları konusunu bitirdim"},
            {"step_index": 2, "completed": False, "notes": "Web framework'leri öğrenmeye başladım"}
        ]
        
        for progress_data in progress_updates:
            try:
                response = self.session.post(f"{API_BASE}/goals/{goal_id}/progress", json=progress_data)
                if response.status_code == 200:
                    result = response.json()
                    self.log_test(f"Update Progress Step {progress_data['step_index']}", True, f"Progress updated, percentage: {result.get('progress_percentage', 0)}%", result)
                    success_count += 1
                else:
                    self.log_test(f"Update Progress Step {progress_data['step_index']}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test(f"Update Progress Step {progress_data['step_index']}", False, f"Error: {str(e)}")
        
        # Test GET progress after updates
        try:
            response = self.session.get(f"{API_BASE}/goals/{goal_id}/progress")
            if response.status_code == 200:
                progress_list = response.json()
                self.log_test("Get Goal Progress (After Updates)", True, f"Retrieved {len(progress_list)} progress records", {"count": len(progress_list), "progress": progress_list})
                success_count += 1
            else:
                self.log_test("Get Goal Progress (After Updates)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Goal Progress (After Updates)", False, f"Error: {str(e)}")
        
        return success_count >= 4  # At least 4 out of 5 tests should pass
    
    def test_statistics(self):
        """Test Statistics endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/stats")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_goals", "completed_goals", "active_goals", "completion_rate"]
                if all(field in stats for field in required_fields):
                    self.log_test("Get Statistics", True, "Statistics retrieved successfully", stats)
                    return True
                else:
                    self.log_test("Get Statistics", False, "Missing required fields in statistics", stats)
                    return False
            else:
                self.log_test("Get Statistics", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Statistics", False, f"Error: {str(e)}")
            return False
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        success_count = 0
        
        # Test GET non-existent goal
        try:
            response = self.session.get(f"{API_BASE}/goals/non-existent-id")
            if response.status_code == 404:
                self.log_test("Error Handling: Non-existent Goal", True, "Correctly returned 404 for non-existent goal")
                success_count += 1
            else:
                self.log_test("Error Handling: Non-existent Goal", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling: Non-existent Goal", False, f"Error: {str(e)}")
        
        # Test DELETE non-existent category
        try:
            response = self.session.delete(f"{API_BASE}/categories/non-existent-id")
            if response.status_code == 404:
                self.log_test("Error Handling: Non-existent Category", True, "Correctly returned 404 for non-existent category")
                success_count += 1
            else:
                self.log_test("Error Handling: Non-existent Category", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling: Non-existent Category", False, f"Error: {str(e)}")
        
        # Test invalid goal creation
        try:
            invalid_goal = {"description": ""}  # Empty description
            response = self.session.post(f"{API_BASE}/goals", json=invalid_goal)
            if response.status_code in [400, 422]:  # Bad request or validation error
                self.log_test("Error Handling: Invalid Goal Data", True, f"Correctly rejected invalid goal data with {response.status_code}")
                success_count += 1
            else:
                self.log_test("Error Handling: Invalid Goal Data", False, f"Expected 400/422, got {response.status_code}")
        except Exception as e:
            self.log_test("Error Handling: Invalid Goal Data", False, f"Error: {str(e)}")
        
        return success_count >= 2  # At least 2 out of 3 tests should pass
    
    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created goals
        for goal in self.created_goals:
            try:
                response = self.session.delete(f"{API_BASE}/goals/{goal['id']}")
                if response.status_code == 200:
                    print(f"   Deleted goal: {goal['description'][:30]}...")
            except Exception as e:
                print(f"   Failed to delete goal {goal['id']}: {str(e)}")
        
        # Delete created categories
        for category in self.created_categories:
            try:
                response = self.session.delete(f"{API_BASE}/categories/{category['id']}")
                if response.status_code == 200:
                    print(f"   Deleted category: {category['name']}")
            except Exception as e:
                print(f"   Failed to delete category {category['id']}: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting AI Goal Coach Backend API Tests")
        print(f"🔗 Testing against: {API_BASE}")
        print("=" * 60)
        
        test_results = {}
        
        # Run tests in logical order
        test_results["health"] = self.test_health_check()
        test_results["categories"] = self.test_categories_crud()
        test_results["goals"] = self.test_goals_crud()
        test_results["progress"] = self.test_progress_tracking()
        test_results["statistics"] = self.test_statistics()
        test_results["error_handling"] = self.test_error_handling()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status}: {test_name.replace('_', ' ').title()}")
        
        print(f"\n🎯 Overall Result: {passed}/{total} test suites passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
        elif passed >= total * 0.8:
            print("⚠️  Most tests passed with minor issues.")
        else:
            print("🚨 Multiple test failures detected. Backend needs attention.")
        
        # Cleanup
        self.cleanup()
        
        return test_results, self.test_results

def main():
    """Main test execution"""
    tester = BackendTester()
    test_results, detailed_results = tester.run_all_tests()
    
    # Save detailed results to file
    with open("/app/backend_test_results.json", "w") as f:
        json.dump({
            "summary": test_results,
            "detailed_results": detailed_results,
            "timestamp": datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    
    return test_results

if __name__ == "__main__":
    main()