import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Tag, X } from 'lucide-react';
import ApiService from '../services/api';

const CATEGORY_COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const CategoryManager = ({ categories, onCategoriesChange, selectedCategoryId, onCategorySelect }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: CATEGORY_COLORS[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showMessage = (message, isError = false) => {
    setError(isError ? message : '');
    if (!isError) {
      // Success message could be handled by parent component
      console.log('Success:', message);
    }
    setTimeout(() => setError(''), 5000);
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      showMessage('Kategori adı gerekli', true);
      return;
    }

    setLoading(true);
    try {
      const category = await ApiService.createCategory(newCategory);
      onCategoriesChange([...categories, category]);
      setNewCategory({ name: '', description: '', color: CATEGORY_COLORS[0] });
      setShowAddForm(false);
      showMessage('Kategori başarıyla oluşturuldu');
    } catch (error) {
      showMessage(error.message, true);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    try {
      await ApiService.deleteCategory(categoryId);
      onCategoriesChange(categories.filter(cat => cat.id !== categoryId));
      if (selectedCategoryId === categoryId) {
        onCategorySelect(null);
      }
      showMessage('Kategori başarıyla silindi');
    } catch (error) {
      showMessage(error.message, true);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setNewCategory({ name: '', description: '', color: CATEGORY_COLORS[0] });
    setShowAddForm(false);
    setEditingCategory(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-soft-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
          <Tag className="w-5 h-5 mr-2 text-primary-600" />
          Kategoriler
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Kategori Ekle
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Category List */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => onCategorySelect(null)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selectedCategoryId === null
              ? 'bg-secondary-800 text-white'
              : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
          }`}
        >
          Tümü
        </button>
        {categories.map((category) => (
          <div key={category.id} className="flex items-center">
            <button
              onClick={() => onCategorySelect(category.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategoryId === category.id
                  ? 'text-white'
                  : 'text-white hover:opacity-80'
              }`}
              style={{ backgroundColor: category.color }}
            >
              {category.name}
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="ml-1 p-1 text-red-500 hover:text-red-700 transition-colors"
              title="Kategoriyi sil"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Category Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-secondary-200 pt-4"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Kategori Adı
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Kategori adını girin..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Kategori açıklaması..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Renk
                </label>
                <div className="flex gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategory({...newCategory, color})}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newCategory.color === color ? 'border-secondary-400' : 'border-secondary-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Oluşturuluyor...' : 'Kategori Oluştur'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 text-sm font-medium"
                >
                  İptal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryManager;