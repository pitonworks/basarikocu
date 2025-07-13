from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import os
from dotenv import load_dotenv
import motor.motor_asyncio
from bson import ObjectId
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="AI Goal Coach API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_goal_coach")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

# Collections
goals_collection = db.goals
categories_collection = db.categories
progress_collection = db.progress

# Security
security = HTTPBearer()

# Pydantic models
class CategoryModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    color: str = "#0ea5e9"  # Default blue color
    created_at: datetime = Field(default_factory=datetime.now)

class ProgressModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal_id: str
    step_index: int
    completed: bool = False
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

class GoalModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    category_id: Optional[str] = None
    tags: List[str] = []
    priority: str = "medium"  # low, medium, high
    status: str = "active"  # active, completed, paused
    progress_percentage: float = 0.0
    steps: List[str] = []
    resources: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

class GoalCreateModel(BaseModel):
    description: str
    category_id: Optional[str] = None
    tags: List[str] = []
    priority: str = "medium"

class GoalUpdateModel(BaseModel):
    description: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    steps: Optional[List[str]] = None
    resources: Optional[List[dict]] = None

class ProgressUpdateModel(BaseModel):
    step_index: int
    completed: bool
    notes: Optional[str] = None

# Helper functions
def goal_helper(goal) -> dict:
    return {
        "id": goal["id"],
        "description": goal["description"],
        "category_id": goal.get("category_id"),
        "tags": goal.get("tags", []),
        "priority": goal.get("priority", "medium"),
        "status": goal.get("status", "active"),
        "progress_percentage": goal.get("progress_percentage", 0.0),
        "steps": goal.get("steps", []),
        "resources": goal.get("resources", []),
        "created_at": goal["created_at"],
        "updated_at": goal["updated_at"],
        "completed_at": goal.get("completed_at")
    }

def category_helper(category) -> dict:
    return {
        "id": category["id"],
        "name": category["name"],
        "description": category.get("description"),
        "color": category.get("color", "#0ea5e9"),
        "created_at": category["created_at"]
    }

async def calculate_progress_percentage(goal_id: str) -> float:
    """Calculate progress percentage based on completed steps"""
    goal = await goals_collection.find_one({"id": goal_id})
    if not goal or not goal.get("steps"):
        return 0.0
    
    total_steps = len(goal["steps"])
    completed_steps = await progress_collection.count_documents({
        "goal_id": goal_id,
        "completed": True
    })
    
    return (completed_steps / total_steps) * 100 if total_steps > 0 else 0.0

# API Routes

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now()}

# Categories endpoints
@app.get("/api/categories", response_model=List[dict])
async def get_categories():
    """Get all categories"""
    categories = []
    async for category in categories_collection.find():
        categories.append(category_helper(category))
    return categories

@app.post("/api/categories", response_model=dict)
async def create_category(category: CategoryModel):
    """Create a new category"""
    category_dict = category.dict()
    result = await categories_collection.insert_one(category_dict)
    if result.inserted_id:
        return category_helper(category_dict)
    raise HTTPException(status_code=400, detail="Kategori oluşturulamadı")

@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    result = await categories_collection.delete_one({"id": category_id})
    if result.deleted_count:
        return {"message": "Kategori başarıyla silindi"}
    raise HTTPException(status_code=404, detail="Kategori bulunamadı")

# Goals endpoints
@app.get("/api/goals", response_model=List[dict])
async def get_goals(category_id: Optional[str] = None, status: Optional[str] = None):
    """Get all goals with optional filtering"""
    query = {}
    if category_id:
        query["category_id"] = category_id
    if status:
        query["status"] = status
    
    goals = []
    async for goal in goals_collection.find(query).sort("created_at", -1):
        goals.append(goal_helper(goal))
    return goals

@app.post("/api/goals", response_model=dict)
async def create_goal(goal: GoalCreateModel):
    """Create a new goal"""
    goal_data = GoalModel(**goal.dict())
    goal_dict = goal_data.dict()
    
    result = await goals_collection.insert_one(goal_dict)
    if result.inserted_id:
        return goal_helper(goal_dict)
    raise HTTPException(status_code=400, detail="Hedef oluşturulamadı")

@app.get("/api/goals/{goal_id}", response_model=dict)
async def get_goal(goal_id: str):
    """Get a specific goal"""
    goal = await goals_collection.find_one({"id": goal_id})
    if goal:
        return goal_helper(goal)
    raise HTTPException(status_code=404, detail="Hedef bulunamadı")

@app.put("/api/goals/{goal_id}", response_model=dict)
async def update_goal(goal_id: str, goal_update: GoalUpdateModel):
    """Update a goal"""
    update_data = {k: v for k, v in goal_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now()
    
    # If status is being set to completed, set completed_at
    if update_data.get("status") == "completed":
        update_data["completed_at"] = datetime.now()
        update_data["progress_percentage"] = 100.0
    
    result = await goals_collection.update_one(
        {"id": goal_id},
        {"$set": update_data}
    )
    
    if result.matched_count:
        goal = await goals_collection.find_one({"id": goal_id})
        return goal_helper(goal)
    raise HTTPException(status_code=404, detail="Hedef bulunamadı")

@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: str):
    """Delete a goal"""
    # Also delete associated progress records
    await progress_collection.delete_many({"goal_id": goal_id})
    
    result = await goals_collection.delete_one({"id": goal_id})
    if result.deleted_count:
        return {"message": "Hedef başarıyla silindi"}
    raise HTTPException(status_code=404, detail="Hedef bulunamadı")

# Progress tracking endpoints
@app.get("/api/goals/{goal_id}/progress", response_model=List[dict])
async def get_goal_progress(goal_id: str):
    """Get progress for a specific goal"""
    progress_list = []
    async for progress in progress_collection.find({"goal_id": goal_id}).sort("step_index", 1):
        progress_list.append({
            "id": progress["id"],
            "goal_id": progress["goal_id"],
            "step_index": progress["step_index"],
            "completed": progress["completed"],
            "completed_at": progress.get("completed_at"),
            "notes": progress.get("notes")
        })
    return progress_list

@app.post("/api/goals/{goal_id}/progress", response_model=dict)
async def update_step_progress(goal_id: str, progress_update: ProgressUpdateModel):
    """Update progress for a specific step"""
    # Check if progress record exists
    existing_progress = await progress_collection.find_one({
        "goal_id": goal_id,
        "step_index": progress_update.step_index
    })
    
    progress_data = {
        "goal_id": goal_id,
        "step_index": progress_update.step_index,
        "completed": progress_update.completed,
        "notes": progress_update.notes
    }
    
    if progress_update.completed:
        progress_data["completed_at"] = datetime.now()
    else:
        progress_data["completed_at"] = None
    
    if existing_progress:
        # Update existing progress
        await progress_collection.update_one(
            {"goal_id": goal_id, "step_index": progress_update.step_index},
            {"$set": progress_data}
        )
    else:
        # Create new progress record
        progress_data["id"] = str(uuid.uuid4())
        await progress_collection.insert_one(progress_data)
    
    # Update goal progress percentage
    new_percentage = await calculate_progress_percentage(goal_id)
    await goals_collection.update_one(
        {"id": goal_id},
        {"$set": {"progress_percentage": new_percentage, "updated_at": datetime.now()}}
    )
    
    return {"message": "İlerleme başarıyla güncellendi", "progress_percentage": new_percentage}

# Statistics endpoint
@app.get("/api/stats")
async def get_stats():
    """Get statistics"""
    total_goals = await goals_collection.count_documents({})
    completed_goals = await goals_collection.count_documents({"status": "completed"})
    active_goals = await goals_collection.count_documents({"status": "active"})
    
    return {
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "active_goals": active_goals,
        "completion_rate": (completed_goals / total_goals * 100) if total_goals > 0 else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)