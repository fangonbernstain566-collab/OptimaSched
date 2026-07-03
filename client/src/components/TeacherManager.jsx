import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { Box, Typography, Button } from '@mui/material'; 
import { Add as AddIcon } from '@mui/icons-material'; 

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    maxTeachingLoad: 15,
    departmentName: 'Information Technology Dept'
  });

  const { toast, showToast, hideToast } = useToast();

  // ✅ FIX: this function didn't exist at all before — every request was sent
  // with zero auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('optimasched_token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/teachers', getAuthHeaders());
      if (response.data.success) {
        setTeachers(response.data.data);
      }
    } catch (error) {
      showToast(
        error.response?.data?.message ?? 'Failed to load instructor roster.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/teachers', formData, getAuthHeaders());
      if (response.data.success) {
        showToast(response.data.message ?? 'Instructor registered successfully!', 'success');
        setIsModalOpen(false);
        setFormData({
          firstName: '', lastName: '', email: '',
          maxTeachingLoad: 15, departmentName: 'Information Technology Dept',
        });
        fetchTeachers();
      }
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Failed to save instructor profile.', 'error');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading faculty roster...</div>;

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>

      <Toast toast={toast} onClose={hideToast} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
  <Typography variant="h4" fontWeight={800} sx={{ color: '#1e293b' }}>
    OptimaSched Faculty Roster Directory
  </Typography>
  <Button
    variant="contained"
    startIcon={<AddIcon />}
    onClick={() => setIsModalOpen(true)}
    sx={{ bgcolor: '#2563eb', borderRadius: '12px', textTransform: 'none' }}
  >
    Register New Teacher
  </Button>
</Box>

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
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No active instructors registered in the database system yet.
              </td>
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