// src/components/Blog/BlogPublic.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../../config/firebase';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import './BlogPublic.css';

const CATEGORIES = ['All', 'Notice', 'Announcement', 'Update', 'General'];

const BlogPublic = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useDocumentMeta({
    title: 'Notices & Announcements',
    description: 'Read the latest notices, announcements, and updates from AuthExam.',
    path: '/notices',
  });

  useEffect(() => {
    const postsRef = ref(db, 'BlogPosts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      if (data) {
        Object.keys(data).forEach((key) => {
          const post = data[key];
          if (post.isPublished !== false) {
            loaded.push({ id: key, ...post });
          }
        });
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
      setPosts(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = filter === 'All' ? posts : posts.filter((p) => p.category === filter);

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(typeof ts === 'object' ? Date.now() : ts).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  };

  return (
    <div className="blog-public-container">
      <div className="blog-public-hero">
        <h1>📢 Notices & Announcements</h1>
        <p>Stay up to date with the latest updates from AuthExam</p>
      </div>

      <div className="blog-filter-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="blog-public-loading">Loading notices...</div>
      ) : filtered.length === 0 ? (
        <div className="blog-public-empty">
          <span>📭</span>
          <p>No {filter === 'All' ? '' : filter + ' '}posts yet.</p>
        </div>
      ) : (
        <div className="blog-public-grid">
          {filtered.map((post) => (
            <Link
              key={post.id}
              to={`/notices/${post.slug || post.id}`}
              className="blog-public-card"
            >
              <div className="blog-public-card-top">
                <span className={`pub-cat-tag cat-${post.category?.toLowerCase()}`}>
                  {post.category || 'General'}
                </span>
                <span className="pub-date">{formatDate(post.createdAt)}</span>
              </div>
              <h3 className="pub-post-title">{post.title}</h3>
              <p className="pub-post-body">
                {post.content.length > 180 ? post.content.substring(0, 180) + '...' : post.content}
              </p>
              {post.content.length > 180 && (
                <span className="pub-read-more">Read more &rarr;</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogPublic;
