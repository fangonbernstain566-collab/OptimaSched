import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    maxTeachingLoad: 15,
    departmentName: 'Information Technology Dept' // Auto fallback string
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/teachers');
      if (response.data.success) {
        setTeachers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching instructor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/teachers', formData);
      if (response.data.success) {
        alert('🎉 Instructor profile registered successfully!');
        setIsModalOpen(false);
        // Reset Form
        setFormData({ firstName: '', lastName: '', email: '', maxTeachingLoad: 15, departmentName: 'Information Technology Dept' });
        fetchTeachers();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save instructor profile.');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading faculty roster...</div>;

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>OptimaSched Faculty Roster Directory</h2>
        <button onClick={() => setIsModalOpen(true)} style={{ padding: '10px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          + Register New Teacher
        </button>
      </div>

      {/* Roster Table Layout */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '12px' }}>Name</th>
            <th style={{ padding: '12px' }}>Academic Email Address</th>
            <th style={{ padding: '12px' }}>Assigned Department</th>
            <th style={{ padding: '12px' }}>Max Units Load</th>
          </tr>
        </thead>
        <tbody>
          {teachers.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No active instructors registered in the database system yet.</td>
            </tr>
          ) : (
            teachers.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}><strong>{t.user?.firstName} {t.user?.lastName}</strong></td>
                <td style={{ padding: '12px' }}>{t.user?.email}</td>
                <td style={{ padding: '12px' }}>{t.department?.name || 'General Education'}</td>
                <td style={{ padding: '12px' }}>{t.maxTeachingLoad} Units</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Entry Modal Overlay Form */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '30px', borderRadius: '8px', width: '400px' }}>
            <h3>Onboard New Academic Faculty</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>First Name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }} required />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }} required />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }} required />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Target Department</label>
              <input type="text" name="departmentName" value={formData.departmentName} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }} required />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Max Teaching Unit Load</label>
              <input type="number" name="maxTeachingLoad" value={formData.maxTeachingLoad} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }} required />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 14px', background: '#e0e0e0', border: 'none', borderRadius: '4px' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 14px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px' }}>Save Profile</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}