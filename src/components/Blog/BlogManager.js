// src/components/Blog/BlogManager.js
import React, { useState, useEffect } from 'react';
import { ref, push, onValue, remove, update, serverTimestamp, get } from 'firebase/database';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import './BlogManager.css';

const CATEGORIES = ['Notice', 'Announcement', 'Update', 'General'];

const BlogManager = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'Notice',
    isPublished: true,
  });

  useEffect(() => {
    const postsRef = ref(db, 'BlogPosts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      if (data) {
        Object.keys(data).forEach((key) => {
          loaded.push({ id: key, ...data[key] });
        });
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
      setPosts(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setForm({ title: '', content: '', category: 'Notice', isPublished: true });
    setEditingPost(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (post) => {
    setForm({
      title: post.title,
      content: post.content,
      category: post.category || 'Notice',
      isPublished: post.isPublished !== false,
    });
    setEditingPost(post);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (editingPost) {
        await update(ref(db, `BlogPosts/${editingPost.id}`), {
          ...form,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
        setSuccessMsg('Post updated successfully!');
      } else {
        await push(ref(db, 'BlogPosts'), {
          ...form,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          authorName: user.displayName || user.email?.split('@')[0] || 'Admin',
        });
        setSuccessMsg('Post published successfully!');
      }
      resetForm();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to save post. Please try again.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (postId) => {
    try {
      await remove(ref(db, `BlogPosts/${postId}`));
      setDeleteConfirm(null);
      setSuccessMsg('Post deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to delete post.');
    }
  };

  const togglePublish = async (post) => {
    await update(ref(db, `BlogPosts/${post.id}`), {
      isPublished: !post.isPublished,
      updatedAt: serverTimestamp(),
    });
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(typeof ts === 'object' ? Date.now() : ts).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  if (!isAdmin) return null;

  return (
    <div className="blog-manager-container">
      <div className="blog-manager-header">
        <div className="blog-manager-title">
          <h2>📢 Blog & Notices</h2>
          <p className="blog-manager-subtitle">Publish updates, notices, and announcements</p>
        </div>
        {!showForm && (
          <button className="btn-publish-new" onClick={() => setShowForm(true)}>
            + New Post
          </button>
        )}
      </div>

      {successMsg && <div className="blog-success-msg">✅ {successMsg}</div>}

      {showForm && (
        <div className="blog-form-card">
          <h3>{editingPost ? '✏️ Edit Post' : '📝 Create New Post'}</h3>
          {error && <p className="blog-form-error">{error}</p>}
          <form onSubmit={handleSubmit} className="blog-form">
            <div className="blog-form-row">
              <div className="blog-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter post title..."
                  disabled={submitting}
                  maxLength={150}
                />
              </div>
              <div className="blog-form-group blog-form-group--small">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  disabled={submitting}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="blog-form-group">
              <label>Content *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your notice or blog content here..."
                rows={8}
                disabled={submitting}
              />
            </div>

            <div className="blog-form-toggle-row">
              <label className="blog-toggle-label">
                <span>Publish immediately</span>
                <div
                  className={`blog-toggle ${form.isPublished ? 'active' : ''}`}
                  onClick={() => !submitting && setForm({ ...form, isPublished: !form.isPublished })}
                >
                  <div className="blog-toggle-knob" />
                </div>
              </label>
              <span className={`publish-status-badge ${form.isPublished ? 'published' : 'draft'}`}>
                {form.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>

            <div className="blog-form-actions">
              <button type="submit" className="btn-submit-post" disabled={submitting}>
                {submitting ? 'Saving...' : editingPost ? 'Update Post' : 'Publish Post'}
              </button>
              <button type="button" className="btn-cancel-post" onClick={resetForm} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="blog-posts-section">
        <h3>All Posts ({posts.length})</h3>
        {loading ? (
          <div className="blog-loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="blog-empty">No posts yet. Create your first post!</div>
        ) : (
          <div className="blog-posts-list">
            {posts.map((post) => (
              <div key={post.id} className={`blog-post-card ${!post.isPublished ? 'draft' : ''}`}>
                <div className="blog-post-card-header">
                  <div className="blog-post-meta">
                    <span className={`blog-category-tag cat-${post.category?.toLowerCase()}`}>
                      {post.category || 'General'}
                    </span>
                    <span className={`blog-publish-badge ${post.isPublished ? 'pub' : 'dft'}`}>
                      {post.isPublished ? '● Published' : '○ Draft'}
                    </span>
                  </div>
                  <span className="blog-post-date">{formatDate(post.createdAt)}</span>
                </div>
                <h4 className="blog-post-title">{post.title}</h4>
                <p className="blog-post-excerpt">
                  {post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}
                </p>
                <div className="blog-post-actions">
                  <button className="btn-edit-post" onClick={() => handleEdit(post)}>✏️ Edit</button>
                  <button
                    className={`btn-toggle-post ${post.isPublished ? 'unpublish' : 'republish'}`}
                    onClick={() => togglePublish(post)}
                  >
                    {post.isPublished ? '🚫 Unpublish' : '✅ Publish'}
                  </button>
                  <button className="btn-delete-post" onClick={() => setDeleteConfirm(post.id)}>
                    🗑️ Delete
                  </button>
                </div>
                {deleteConfirm === post.id && (
                  <div className="delete-confirm-bar">
                    <span>Are you sure you want to delete this post?</span>
                    <button className="btn-confirm-delete" onClick={() => handleDelete(post.id)}>Yes, Delete</button>
                    <button className="btn-cancel-delete" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogManager;
