// src/components/ContactForm/ContactForm.js
import { useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaPaperPlane } from 'react-icons/fa';
import './ContactForm.css';

const initialState = { name: '', email: '', phone: '', organization: '', message: '' };

const ContactForm = () => {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus('error');
      setErrorMsg('Please fill in your name, email, and message.');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      const { getDatabase, ref, push, set, serverTimestamp } = await import('firebase/database');
      const { app } = await import('../../config/firebase');
      const db = getDatabase(app);

      const newRef = push(ref(db, 'ContactMessages'));
      await set(newRef, {
        ...form,
        createdAt: serverTimestamp(),
        status: 'new',
      });

      setStatus('success');
      setForm(initialState);
    } catch (err) {
      console.error('Contact form submission error:', err);
      setStatus('error');
      setErrorMsg('Something went wrong sending your message. Please try again or email us directly.');
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {status === 'success' && (
        <div className="contact-form-alert success">
          Thanks! Your message has been sent - our team will get back to you soon.
        </div>
      )}
      {status === 'error' && (
        <div className="contact-form-alert error">{errorMsg}</div>
      )}

      <div className="contact-form-row">
        <div className="contact-input-group">
          <FaUser className="contact-input-icon" />
          <input
            type="text"
            name="name"
            placeholder="Full Name *"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="contact-input-group">
          <FaEnvelope className="contact-input-icon" />
          <input
            type="email"
            name="email"
            placeholder="Email Address *"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="contact-form-row">
        <div className="contact-input-group">
          <FaPhone className="contact-input-icon" />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
          />
        </div>
        <div className="contact-input-group">
          <FaBuilding className="contact-input-icon" />
          <input
            type="text"
            name="organization"
            placeholder="Organization / Institute"
            value={form.organization}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="contact-input-group textarea-group">
        <textarea
          name="message"
          placeholder="Tell us what you need *"
          rows={5}
          value={form.message}
          onChange={handleChange}
          required
        />
      </div>

      <button type="submit" className="contact-submit-btn" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending...' : (<>Send Message <FaPaperPlane className="btn-icon" /></>)}
      </button>
    </form>
  );
};

export default ContactForm;
