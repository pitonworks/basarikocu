import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, BookOpen, AlertCircle, Loader2, Key, ChevronDown, ChevronRight, Filter, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ApiService from './services/api';
import CategoryManager from './components/CategoryManager';
import ProgressTracker from './components/ProgressTracker';
import './App.css';

function App() {
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [newGoal, setNewGoal] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('');
  const [newGoalTags, setNewGoalTags] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [showApiInput, setShowApiInput] = useState(!localStorage.getItem('openai_api_key'));
  const [collapsedGoals, setCollapsedGoals] = useState(() => {
    const saved = localStorage.getItem('collapsedGoals');
    return saved ? JSON.parse(saved) : {};
  });
  const [stats, setStats] = useState({
    total_goals: 0,
    completed_goals: 0,
    active_goals: 0,
    completion_rate: 0
  });

  useEffect(() => {
    loadGoals();
    loadCategories();
    loadStats();
  }, [selectedCategoryId]);

  useEffect(() => {
    localStorage.setItem('collapsedGoals', JSON.stringify(collapsedGoals));
  }, [collapsedGoals]);

  const loadGoals = async () => {
    try {
      const goalsData = await ApiService.getGoals(selectedCategoryId);
      setGoals(goalsData);
    } catch (error) {
      showMessage('Hedefler yüklenemedi: ' + error.message, true);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await ApiService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      showMessage('Kategoriler yüklenemedi: ' + error.message, true);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await ApiService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  };

  const toggleGoal = (goalId) => {
    setCollapsedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      showMessage('Lütfen OpenAI API anahtarınızı girin', true);
      return;
    }
    localStorage.setItem('openai_api_key', apiKey);
    setShowApiInput(false);
    showMessage('API anahtarı başarıyla kaydedildi!');
  };

  const resetApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setShowApiInput(true);
  };

  const addGoal = async () => {
    if (!newGoal.trim()) {
      showMessage('Lütfen bir hedef açıklaması girin', true);
      return;
    }
    
    setLoading(true);
    try {
      const goalData = {
        description: newGoal,
        category_id: newGoalCategory || null,
        tags: newGoalTags ? newGoalTags.split(',').map(tag => tag.trim()) : [],
        priority: newGoalPriority
      };
      
      const newGoalObj = await ApiService.createGoal(goalData);
      setGoals(prevGoals => [newGoalObj, ...prevGoals]);
      setNewGoal('');
      setNewGoalCategory('');
      setNewGoalTags('');
      setNewGoalPriority('medium');
      showMessage('Hedef başarıyla eklendi!');
      loadStats();
    } catch (error) {
      showMessage('Hedef eklenemedi: ' + error.message, true);
    }
    setLoading(false);
  };

  const getAIGuidance = async (goalId) => {
    if (!apiKey) {
      showMessage('Lütfen önce OpenAI API anahtarınızı ayarlayın', true);
      setShowApiInput(true);
      return;
    }

    setLoading(true);
    const goal = goals.find(g => g.id === goalId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // Using GPT-3.5 for faster response
          messages: [
            {
              role: "system",
              content: `Sen bir AI hedef koçusun. Hedefi eyleme dönüştürülebilir adımlara böl ve ilgili kaynaklar öner. Vurgu ve yapı için markdown formatını kullan. Yanıtını tam olarak gösterildiği gibi formatla:

# Adımlar:
1. **İlk Adım**: Gerektiğinde *vurgu* ile detaylı açıklama
2. **İkinci Adım**: Potansiyel **önemli noktalar** ile net talimatlar
3. **Üçüncü Adım**: Pratik tavsiyeler içeren adım açıklaması
(5 adıma kadar devam edin)

# Kaynaklar:
- **Kaynak 1**: Bu kaynağın nasıl yardımcı olduğunun kısa açıklaması
- **Kaynak 2**: Kaynağın değerinin açıklaması  
- **Kaynak 3**: Bu kaynağın hedefi nasıl desteklediği

Not: Vurgu için markdown formatını (*italik*) ve **kalın** metin kullanın. Yanıtları kısa ama bilgilendirici tutun.`
            },
            {
              role: "user",
              content: `Bu hedefe ulaşmama yardım et: ${goal.description}. Lütfen 5 adıma kadar ve 3 kaynak içeren kısa bir yanıt ver.`
            }
          ],
          max_tokens: 500, // Limiting response size
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'AI rehberliği alınamadı. Lütfen API anahtarınızı kontrol edin.');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse the response
      const steps = [];
      const resources = [];
      
      if (content.includes('# Adımlar:')) {
        const parts = content.split('# Adımlar:');
        const stepsSection = parts[1].split('# Kaynaklar:')[0];
        steps.push(...stepsSection.split('\n')
          .map(step => step.trim())
          .filter(step => step && !step.startsWith('#') && !step.startsWith('-')));
      }

      if (content.includes('# Kaynaklar:')) {
        const resourcesSection = content.split('# Kaynaklar:')[1];
        resources.push(...resourcesSection.split('\n')
          .map(resource => ({
            title: resource.trim(),
            url: '#'
          }))
          .filter(resource => resource.title && resource.title.startsWith('-')));
      }

      setGoals(prevGoals => prevGoals.map(g => 
        g.id === goalId 
          ? { ...g, steps, resources }
          : g
      ));
      showMessage('AI rehberliği başarıyla oluşturuldu!');
      
      // Update goal in backend
      await ApiService.updateGoal(goalId, { steps, resources });
      loadStats();
    } catch (error) {
      showMessage(error.message, true);
    }
    setLoading(false);
  };

  const deleteGoal = async (goalId) => {
    try {
      await ApiService.deleteGoal(goalId);
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
      showMessage('Hedef başarıyla silindi!');
      loadStats();
    } catch (error) {
      showMessage('Hedef silinemedi: ' + error.message, true);
    }
  };

  const handleProgressUpdate = async (goalId, newPercentage) => {
    // Update local state
    setGoals(prevGoals => prevGoals.map(g => 
      g.id === goalId 
        ? { ...g, progress_percentage: newPercentage }
        : g
    ));
    loadStats();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="container mx-auto px-4 py-12">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-4">
            <Target className="w-12 h-12 text-primary-600 mr-4" />
            <h1 className="text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
              AI Hedef Koçu
            </h1>
          </div>
          <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
            Hedeflerinizi eyleme dönüştürülmüş adımlara ayıran akıllı arkadaşınız
          </p>
        </motion.header>

        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`max-w-2xl mx-auto mb-8 p-4 rounded-xl shadow-soft-md flex items-center ${
                error ? 'bg-red-50' : 'bg-green-50'
              }`}
            >
              {error ? (
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
              )}
              <p className={error ? 'text-red-700' : 'text-green-700'}>
                {error || success}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          {/* Statistics Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-soft-md p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-secondary-900">{stats.total_goals}</div>
                  <div className="text-sm text-secondary-600">Toplam Hedef</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft-md p-6">
              <div className="flex items-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-secondary-900">{stats.completed_goals}</div>
                  <div className="text-sm text-secondary-600">Tamamlanan</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft-md p-6">
              <div className="flex items-center">
                <Loader2 className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-secondary-900">{stats.active_goals}</div>
                  <div className="text-sm text-secondary-600">Aktif</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-soft-md p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-secondary-900">{Math.round(stats.completion_rate)}%</div>
                  <div className="text-sm text-secondary-600">Tamamlama Oranı</div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Manager */}
          <CategoryManager
            categories={categories}
            onCategoriesChange={setCategories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={setSelectedCategoryId}
          />

          {showApiInput ? (
            <div className="bg-white rounded-2xl shadow-soft-xl p-8 mb-8">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4 flex items-center">
                <Key className="w-6 h-6 mr-2 text-primary-600" />
                OpenAI API Anahtarınızı Ayarlayın
              </h2>
              <div className="flex gap-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="OpenAI API anahtarınızı girin..."
                  className="flex-1 p-4 border-2 border-secondary-200 rounded-xl text-secondary-800 placeholder-secondary-400 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                />
                <button
                  onClick={saveApiKey}
                  className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all font-semibold shadow-soft-md hover:shadow-soft-xl"
                >
                  Anahtarı Kaydet
                </button>
              </div>
              <p className="mt-4 text-sm text-secondary-600">
                API anahtarınız yerel olarak saklanır ve hiçbir sunucuya gönderilmez.
              </p>
            </div>
          ) : (
            <div className="text-right mb-4">
              <button
                onClick={resetApiKey}
                className="text-sm text-secondary-600 hover:text-secondary-800"
              >
                API Anahtarını Sıfırla
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-soft-xl p-8 mb-8">
            <div className="space-y-6">
              {/* Goal Description */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Hedef Açıklaması
                </label>
                <textarea
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Bir sonraki büyük hedefiniz nedir? Markdown formatını kullanabilirsiniz."
                  className="w-full p-4 border-2 border-secondary-200 rounded-xl text-secondary-800 placeholder-secondary-400 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all min-h-[100px] resize-y"
                  disabled={loading}
                />
              </div>

              {/* Goal Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="w-full p-3 border-2 border-secondary-200 rounded-xl text-secondary-800 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  >
                    <option value="">Kategori seçin (opsiyonel)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Öncelik
                  </label>
                  <select
                    value={newGoalPriority}
                    onChange={(e) => setNewGoalPriority(e.target.value)}
                    className="w-full p-3 border-2 border-secondary-200 rounded-xl text-secondary-800 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Etiketler
                  </label>
                  <input
                    type="text"
                    value={newGoalTags}
                    onChange={(e) => setNewGoalTags(e.target.value)}
                    placeholder="etiket1, etiket2, etiket3"
                    className="w-full p-3 border-2 border-secondary-200 rounded-xl text-secondary-800 placeholder-secondary-400 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={addGoal}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 font-semibold shadow-soft-md hover:shadow-soft-xl"
                >
                  {loading ? 'Ekleniyor...' : 'Hedef Ekle'}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  <p className="mt-4 text-secondary-600">AI rehberliği alınıyor...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div layout className="space-y-6">
              {goals.map((goal) => (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-secondary-50 rounded-xl p-6 border border-secondary-100 hover:shadow-soft-md transition-all"
                >
                  <div 
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleGoal(goal.id)}
                  >
                    <div className="flex items-start flex-1 mr-4">
                      <div className="flex items-center mr-2 mt-1.5">
                        {collapsedGoals[goal.id] ? (
                          <ChevronRight className="w-5 h-5 text-secondary-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-secondary-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="text-xl font-semibold text-secondary-900"
                            components={{
                              p: ({node, ...props}) => <p className="my-0" {...props} />,
                              a: ({node, children, ...props}) => (
                                <a 
                                  className="text-primary-600 hover:text-primary-800" 
                                  {...props}
                                  aria-label={typeof children === 'string' ? children : 'Link'}
                                  role="link"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {goal.description}
                          </ReactMarkdown>
                        </div>
                        
                        {/* Goal Meta Info */}
                        <div className="flex items-center gap-4 mt-3 text-sm text-secondary-600">
                          {goal.category_id && (
                            <div className="flex items-center">
                              <span 
                                className="w-3 h-3 rounded-full mr-1"
                                style={{ backgroundColor: categories.find(c => c.id === goal.category_id)?.color || '#0ea5e9' }}
                              />
                              {categories.find(c => c.id === goal.category_id)?.name}
                            </div>
                          )}
                          
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                            goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {goal.priority === 'high' ? 'Yüksek' : 
                             goal.priority === 'medium' ? 'Orta' : 'Düşük'}
                          </div>

                          {goal.tags && goal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {goal.tags.map((tag, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {goal.progress_percentage > 0 && (
                            <div className="flex items-center">
                              <div className="w-16 h-2 bg-secondary-200 rounded-full mr-2">
                                <div 
                                  className="h-2 bg-primary-500 rounded-full transition-all"
                                  style={{ width: `${goal.progress_percentage}%` }}
                                />
                              </div>
                              <span className="text-primary-600 font-medium">
                                {Math.round(goal.progress_percentage)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {!goal.steps && (
                        <button
                          onClick={() => getAIGuidance(goal.id)}
                          disabled={loading}
                          className="flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Target className="w-4 h-4 mr-2" />
                          )}
                          AI Rehberliği Al
                        </button>
                      )}
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {!collapsedGoals[goal.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {/* Progress Tracker */}
                        {goal.steps && goal.steps.length > 0 && (
                          <div className="mt-6">
                            <ProgressTracker 
                              goal={goal} 
                              onProgressUpdate={(percentage) => handleProgressUpdate(goal.id, percentage)}
                            />
                          </div>
                        )}

                        {goal.steps && (
                          <div className="mt-6">
                            <div className="flex items-center text-secondary-800 mb-3">
                              <CheckCircle2 className="w-5 h-5 mr-2 text-primary-600" />
                              <h4 className="font-semibold">Eylem Adımları</h4>
                            </div>
                            <div className="space-y-2">
                              {goal.steps.map((step, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex items-start"
                                >
                                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-medium mr-3 flex-shrink-0 mt-1">
                                    {index + 1}
                                  </span>
                                  <div className="flex-1 prose prose-sm max-w-none prose-p:mt-0 prose-p:mb-0">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      className="text-gray-600"
                                      components={{
                                        p: ({node, ...props}) => <p className="my-0" {...props} />,
                                        a: ({node, children, ...props}) => (
                                          <a 
                                            className="text-primary-600 hover:text-primary-800" 
                                            {...props}
                                            aria-label={typeof children === 'string' ? children : 'Link'}
                                            role="link"
                                          >
                                            {children}
                                          </a>
                                        ),
                                        ul: ({node, ...props}) => <ul className="my-1" {...props} />,
                                        ol: ({node, ...props}) => <ol className="my-1" {...props} />,
                                        li: ({node, ...props}) => <li className="my-0.5" {...props} />,
                                      }}
                                    >
                                      {step}
                                    </ReactMarkdown>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {goal.resources && goal.resources.length > 0 && (
                          <div className="mt-6">
                            <div className="flex items-center text-secondary-800 mb-3">
                              <BookOpen className="w-5 h-5 mr-2 text-primary-600" />
                              <h4 className="font-semibold">Faydalı Kaynaklar</h4>
                            </div>
                            <div className="space-y-2">
                              {goal.resources.map((resource, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="flex items-start ml-7"
                                >
                                  <span className="w-2 h-2 rounded-full bg-primary-400 mr-2 mt-2 flex-shrink-0"></span>
                                  <div className="flex-1 prose prose-sm max-w-none prose-p:mt-0 prose-p:mb-0">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      className="text-primary-600"
                                      components={{
                                        p: ({node, ...props}) => <p className="my-0" {...props} />,
                                        a: ({node, children, ...props}) => (
                                          <a 
                                            className="text-primary-600 hover:text-primary-800" 
                                            {...props}
                                            aria-label={typeof children === 'string' ? children : 'Link'}
                                            role="link"
                                          >
                                            {children}
                                          </a>
                                        ),
                                        ul: ({node, ...props}) => <ul className="my-1" {...props} />,
                                        ol: ({node, ...props}) => <ol className="my-1" {...props} />,
                                        li: ({node, ...props}) => <li className="my-0.5" {...props} />,
                                      }}
                                    >
                                      {resource.title}
                                    </ReactMarkdown>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default App;
