import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Target, TrendingUp } from 'lucide-react';
import ApiService from '../services/api';

const ProgressTracker = ({ goal, onProgressUpdate }) => {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (goal && goal.steps && goal.steps.length > 0) {
      loadProgress();
    }
  }, [goal]);

  const loadProgress = async () => {
    if (!goal || !goal.id) return;

    setLoading(true);
    try {
      const progressData = await ApiService.getGoalProgress(goal.id);
      setProgress(progressData);
    } catch (error) {
      setError('İlerleme bilgisi yüklenemedi');
    }
    setLoading(false);
  };

  const handleStepToggle = async (stepIndex) => {
    if (!goal || !goal.id) return;

    const currentProgress = progress.find(p => p.step_index === stepIndex);
    const newCompleted = !currentProgress?.completed;

    setLoading(true);
    try {
      const result = await ApiService.updateStepProgress(goal.id, {
        step_index: stepIndex,
        completed: newCompleted
      });

      // Update local progress state
      const updatedProgress = progress.filter(p => p.step_index !== stepIndex);
      if (newCompleted) {
        updatedProgress.push({
          id: `${goal.id}-${stepIndex}`,
          goal_id: goal.id,
          step_index: stepIndex,
          completed: true,
          completed_at: new Date().toISOString()
        });
      }
      setProgress(updatedProgress);

      // Notify parent component about progress update
      if (onProgressUpdate) {
        onProgressUpdate(result.progress_percentage);
      }
    } catch (error) {
      setError('İlerleme güncellenemedi');
    }
    setLoading(false);
  };

  const getStepStatus = (stepIndex) => {
    const stepProgress = progress.find(p => p.step_index === stepIndex);
    return stepProgress?.completed || false;
  };

  const getCompletedStepsCount = () => {
    return progress.filter(p => p.completed).length;
  };

  const getProgressPercentage = () => {
    if (!goal || !goal.steps || goal.steps.length === 0) return 0;
    return (getCompletedStepsCount() / goal.steps.length) * 100;
  };

  if (!goal || !goal.steps || goal.steps.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-soft-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
          <Target className="w-5 h-5 mr-2 text-primary-600" />
          İlerleme Takibi
        </h3>
        <div className="flex items-center text-sm text-secondary-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          {getCompletedStepsCount()}/{goal.steps.length} adım tamamlandı
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-secondary-700">Genel İlerleme</span>
          <span className="text-sm font-medium text-primary-600">
            {Math.round(getProgressPercentage())}%
          </span>
        </div>
        <div className="w-full bg-secondary-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full"
            style={{ width: `${getProgressPercentage()}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${getProgressPercentage()}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {goal.steps.map((step, index) => {
          const isCompleted = getStepStatus(index);
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start p-4 rounded-lg border-2 transition-all cursor-pointer ${
                isCompleted
                  ? 'border-green-200 bg-green-50'
                  : 'border-secondary-200 bg-secondary-50 hover:border-primary-300'
              }`}
              onClick={() => handleStepToggle(index)}
            >
              <div className="flex-shrink-0 mr-4 mt-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Circle className="w-6 h-6 text-secondary-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  isCompleted ? 'text-green-800 line-through' : 'text-secondary-800'
                }`}>
                  Adım {index + 1}
                </div>
                <div className={`text-sm mt-1 ${
                  isCompleted ? 'text-green-600' : 'text-secondary-600'
                }`}>
                  {step}
                </div>
              </div>

              {isCompleted && (
                <div className="flex-shrink-0 ml-2">
                  <div className="flex items-center text-xs text-green-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Tamamlandı
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="text-sm text-secondary-600">Güncelleniyor...</div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;