"use client";

import { useState, useEffect } from 'react';

export default function EditGroupModal({ isOpen, onClose, onUpdate, group }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('Public');
  const [coverImage, setCoverImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (group && isOpen) {
      setName(group.name || '');
      setDescription(group.description || '');
      setPrivacy(group.privacy || 'Public');
      setCoverImage(group.coverImage || '');
      setUploadError('');
    }
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdate({ name, description, privacy, coverImage });
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setCoverImage(data.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Group</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Cover Image</label>
            <div className="flex items-center gap-4">
              {coverImage && (
                <img src={coverImage} alt="Cover" className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-slate-600" />
              )}
              <label className={`cursor-pointer bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? 'Uploading...' : 'Choose Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </label>
              {coverImage && !isUploading && (
                <button type="button" onClick={() => setCoverImage('')} className="text-red-500 hover:text-red-600 text-sm">Remove</button>
              )}
            </div>
            {uploadError && (
              <p className="mt-2 text-sm text-red-500">{uploadError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Privacy</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 dark:text-slate-200 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}