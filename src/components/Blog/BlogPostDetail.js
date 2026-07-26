// src/components/Blog/BlogPostDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../../config/firebase';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import './BlogPublic.css';

const formatDate = (ts) => {
  if (!ts) return '—';
  return new Date(typeof ts === 'object' ? Date.now() : ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

const BlogPostDetail = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    const postsRef = ref(db, 'BlogPosts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setPost(null);
        return;
      }
      const match = Object.keys(data)
        .map((key) => ({ id: key, ...data[key] }))
        // support both new slugged posts and older posts saved before slugs existed
        .find((p) => (p.slug ? p.slug === slug : p.id === slug) && p.isPublished !== false);
      setPost(match || null);
    });
    return () => unsubscribe();
  }, [slug]);

  const description = post
    ? (post.content.length > 160 ? post.content.slice(0, 157) + '...' : post.content)
    : undefined;

  useDocumentMeta({
    title: post ? post.title : 'Notices',
    description,
    path: `/notices/${slug}`,
  });

  if (post === null) {
    return <Navigate to="/notices" replace />;
  }

  return (
    <div className="blog-public-container">
      {post === undefined ? (
        <div className="blog-public-loading">Loading notice...</div>
      ) : (
        <article className="blog-public-card blog-post-detail">
          <Link to="/notices" className="pub-back-link">&larr; All Notices</Link>
          <div className="blog-public-card-top">
            <span className={`pub-cat-tag cat-${post.category?.toLowerCase()}`}>
              {post.category || 'General'}
            </span>
            <span className="pub-date">{formatDate(post.createdAt)}</span>
          </div>
          <h1 className="pub-post-title">{post.title}</h1>
          {post.authorName && <p className="pub-post-author">By {post.authorName}</p>}
          <p className="pub-post-body">{post.content}</p>

          {/* Structured data so search engines can render this as an article result */}
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              articleSection: post.category || 'General',
              author: { '@type': 'Organization', name: post.authorName || 'AuthExam' },
              datePublished: typeof post.createdAt === 'number' ? new Date(post.createdAt).toISOString() : undefined,
            })}
          </script>
        </article>
      )}
    </div>
  );
};

export default BlogPostDetail;
