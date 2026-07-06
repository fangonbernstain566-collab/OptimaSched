import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ScheduleManager() {
  // State management for data
  const [schedules, setSchedules] = useState([]);
  const [options, setOptions] = useState({ teachers: [], rooms: [], sections: [], subjectOfferings: [] });
  const [loading, setLoading] = useState(true);

  // State management for the form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    teacherId: '',
    roomId: '',
    sectionId: '',
    subjectOfferingId: '',
    dayOfWeek: 'Monday',
    startTime: '',
    endTime: ''
  });

  // Load schedules and dropdown arrays on component initialization
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [schedRes, optRes] = await Promise.all([
        axios.get('/api/schedules'),
        axios.get('/api/schedules/options')
      ]);
      
      if (schedRes.data.success) setSchedules(schedRes.data.data);
      if (optRes.data.success) setOptions(optRes.data.data);
    } catch (error) {
      alert("Error loading scheduling workspace resources.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for creating a fresh record
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      teacherId: options.teachers[0]?.id || '',
      roomId: options.rooms[0]?.id || '',
      sectionId: options.sections[0]?.id || '',
      subjectOfferingId: options.subjectOfferings[0]?.id || '',
      dayOfWeek: 'Monday',
      startTime: '08:00',
      endTime: '09:00'
    });
    setIsModalOpen(true);
  };

  // Open modal populated with existing data for updates
  const handleOpenEdit = (schedule) => {
    setEditingId(schedule.id);
    setFormData({
      teacherId: schedule.teacherId,
      roomId: schedule.roomId,
      sectionId: schedule.sectionId,
      subjectOfferingId: schedule.subjectOfferingId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    });
    setIsModalOpen(true);
  };

  // Synchronize dynamic user changes with state
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Process data persistence submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Run update logic
        const response = await axios.put(`/api/schedules/${editingId}`, formData);
        if (response.data.success) {
          alert("Schedule updated successfully!");
        }
      } else {
        // Run creation logic
        const response = await axios.post('/api/schedules', formData);
        if (response.data.success) {
          alert("Schedule created successfully!");
        }
      }
      setIsModalOpen(false);
      fetchInitialData(); // Refresh list structure
    } catch (error) {
      if (error.response && error.response.status === 409) {
        // Backend conflict detection intercept handler
        alert(`⚠️ Scheduling Conflict:\n${error.response.data.message}`);
      } else {
        alert("System encountered an error executing data storage validation rules.");
      }
    }
  };

  // Delete execution block
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to completely remove this schedule slot?")) return;
    try {
      const response = await axios.delete(`/api/schedules/${id}`);
      if (response.data.success) {
        alert("Schedule removed successfully.");
        fetchInitialData();
      }
    } catch (error) {
      alert("Error occurred deleting data row.");
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Syncing with OptimaSched Engine resources...</div>;

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>PCLU Academic Schedule Management Panel</h2>
        <button onClick={handleOpenCreate} style={{ padding: '10px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          + Add New Schedule Block
        </button>
      </div>

      {/* Main Table View */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '12px' }}>Day</th>
            <th style={{ padding: '12px' }}>Time Window</th>
            <th style={{ padding: '12px' }}>Instructor</th>
            <th style={{ padding: '12px' }}>Assigned Location</th>
            <th style={{ padding: '12px' }}>Course Section</th>
            <th style={{ padding: '12px' }}>Class Code</th>
            <th style={{ padding: '12px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No entries found inside data layer constraints. Click button to seed workspace records.</td>
            </tr>
          ) : (
            schedules.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}><strong>{item.dayOfWeek}</strong></td>
                <td style={{ padding: '12px' }}>{item.startTime} - {item.endTime}</td>
                <td style={{ padding: '12px' }}>{item.teacher?.user ? `${item.teacher.user.firstName} ${item.teacher.user.lastName}` : 'Unassigned'}</td>
                <td style={{ padding: '12px' }}>{item.room?.name || 'N/A'}</td>
                <td style={{ padding: '12px' }}>{item.section?.name || 'N/A'}</td>
                <td style={{ padding: '12px' }}>{item.subjectOffering?.subject?.code || 'N/A'}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => handleOpenEdit(item)} style={{ marginRight: '8px', padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} style={{ padding: '6px 12px', background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pop-up Data Modification Modal Form */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '30px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3>{editingId ? 'Modify Assigned Slot Configuration' : 'Establish New Timetable Matrix Block'}</h3>
            
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Day of Week</label>
              <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px', display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Start Time</label>
                <input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>End Time</label>
                <input type="time" name="endTime" value={formData.endTime} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }} required />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Assign Instructor</label>
              <select name="teacherId" value={formData.teacherId} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }}>
                {options.teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Target Room Location</label>
              <select name="roomId" value={formData.roomId} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }}>
                {options.rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity || 'N/A'})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Academic Section Target</label>
              <select name="sectionId" value={formData.sectionId} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }}>
                {options.sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Subject Offering</label>
              <select name="subjectOfferingId" value={formData.subjectOfferingId} onChange={handleInputChange} style={{ width: '100%', padding: '8px' }}>
                {options.subjectOfferings.map(so => (
                  <option key={so.id} value={so.id}>{so.subject?.code} - {so.subject?.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Class Code</label>
              <input
                type="text"
                value={options.subjectOfferings.find(so => so.id === formData.subjectOfferingId)?.subject?.code || ''}
                readOnly
                disabled
                style={{ width: '100%', padding: '8px', background: '#f5f5f5', color: '#555' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 14px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 14px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {editingId ? 'Apply Modifications' : 'Commit Data Record'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}