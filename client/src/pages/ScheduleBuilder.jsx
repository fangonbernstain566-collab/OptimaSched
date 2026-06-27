import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ScheduleBuilder = () => {
  const [options, setOptions] = useState({ teachers: [], rooms: [], sections: [], offerings: [], schoolYears: [], semesters: [] });
  const [formData, setFormData] = useState({ 
    teacherId: '', roomId: '', sectionId: '', subjectOfferingId: '', 
    schoolYearId: '', semesterId: '', dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:30' 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/schedules/options');
        setOptions(res.data.data);
      } catch (err) { console.error("Error fetching options:", err); }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/schedules', formData);
      alert('Schedule entry successfully created.');
    } catch (err) { alert('Failed to create schedule.'); }
  };

  return (
    <div className="p-8 bg-white shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-6">Create New Schedule</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
        <select onChange={(e) => setFormData({...formData, teacherId: e.target.value})} className="border p-2 rounded">
          <option value="">Select Teacher</option>
          {options.teachers.map(t => <option key={t.id} value={t.id}>{t.user.firstName} {t.user.lastName}</option>)}
        </select>
        
        <select onChange={(e) => setFormData({...formData, roomId: e.target.value})} className="border p-2 rounded">
          <option value="">Select Room</option>
          {options.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {/* Add Section, Subject Offering, School Year, and Semester dropdowns similarly */}
        
        <button type="submit" className="col-span-2 bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700">
          Commit Schedule to Database
        </button>
      </form>
    </div>
  );
};

export default ScheduleBuilder;