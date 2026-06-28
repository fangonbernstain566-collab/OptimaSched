import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import axios from 'axios';

export default function ManageSchedules() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [rooms, setRooms] = useState([]); // State to hold available rooms
  const [modalData, setModalData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const draggableRef = useRef(null);

  // 1. Fetch Data and Initialize Draggable Items
  useEffect(() => {
    fetchPendingRequests();
    fetchRooms(); // Fetch available rooms
  }, []);

  useEffect(() => {
    // Initialize FullCalendar's external drag listener on the sidebar container
    if (draggableRef.current) {
      new Draggable(draggableRef.current, {
        itemSelector: '.draggable-item',
        eventData: function(eventEl) {
          return {
            title: eventEl.getAttribute('data-title'),
            extendedProps: {
              scheduleId: eventEl.getAttribute('data-id'),
              teacherId: eventEl.getAttribute('data-teacher'),
              subjectName: eventEl.getAttribute('data-subject')
            }
          };
        }
      });
    }
  }, [pendingRequests]);

  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/schedules/pending');
      setPendingRequests(res.data.data);
    } catch (error) {
      console.error('Failed to fetch pending requests', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/rooms');
      setRooms(res.data.data);
    } catch (error) {
      console.error('Failed to fetch rooms', error);
    }
    };

  // 2. Handle Dropping onto the Calendar
  const handleEventReceive = (info) => {
    // Temporarily revert the drop visual until confirmed by the server
    info.revert();
    
    // Extract times (FullCalendar provides Date objects)
    const startTime = info.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = info.event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dayOfWeek = info.event.start.toLocaleDateString('en-US', { weekday: 'long' });

    // Open Confirmation Modal
    setModalData({
      scheduleId: info.event.extendedProps.scheduleId,
      teacherId: info.event.extendedProps.teacherId,
      title: info.event.title,
      dayOfWeek,
      startTime,
      endTime,
      roomId: 'DEFAULT_ROOM_ID' // Replace with your actual room selection state/logic
    });
    setErrorMsg('');
  };

  // 3. Validate and Confirm Schedule
  const confirmSchedule = async () => {
    try {
      // Step A: Validate Conflicts
      await axios.post('http://localhost:5000/api/schedules/validate', modalData);
      
      // Step B: Save if valid
      await axios.post('http://localhost:5000/api/schedules/confirm', modalData);
      
      // Step C: Cleanup UI
      setModalData(null);
      fetchPendingRequests(); // Refresh sidebar
      // Note: Ideally you fetch active schedules here to populate the calendar
      
    } catch (error) {
      // Show conflict error message from backend
      setErrorMsg(error.response?.data?.message || 'Failed to save schedule');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', padding: '20px', gap: '20px' }}>
      
      {/* Sidebar: Pending Requests */}
      <div 
        ref={draggableRef} 
        style={{ width: '300px', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}
      >
        <h3>Pending Requests</h3>
        {pendingRequests.map(req => (
          <div 
            key={req.id}
            className="draggable-item"
            data-id={req.id}
            data-teacher={req.teacherId}
            data-title={`${req.subject?.name || 'Subject'} - ${req.teacher?.lastName || 'Teacher'}`}
            style={{ 
              padding: '10px', 
              background: '#007bff', 
              color: 'white', 
              margin: '10px 0', 
              cursor: 'grab', 
              borderRadius: '4px' 
            }}
          >
            <strong>{req.subject?.name || 'Subject Data Missing'}</strong>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Instructor: {req.teacher?.lastName || 'Unknown'}</p>
          </div>
        ))}
      </div>

      {/* Main Area: Calendar Engine */}
      <div style={{ flex: 1, background: 'white', padding: '15px', borderRadius: '8px' }}>
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          weekends={false}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          droppable={true} // Allows external elements to be dropped
          editable={true}
          eventReceive={handleEventReceive}
        />
      </div>

      {/* Confirmation Modal */}
{modalData && (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }}>
    <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '400px' }}>
      <h3>Confirm Schedule Assignment</h3>
      <div style={{ margin: '20px 0' }}>
        <p><strong>Class:</strong> {modalData.title}</p>
        <p><strong>Day:</strong> {modalData.dayOfWeek}</p>
        <p><strong>Time:</strong> {modalData.startTime} - {modalData.endTime}</p>
        
        {/* 👈 NEW ROOM DROPDOWN */}
        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Assign Room:
          </label>
          <select 
            value={modalData.roomId} 
            onChange={(e) => setModalData({ ...modalData, roomId: e.target.value })}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="" disabled>-- Select a Room --</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name} (Capacity: {room.capacity})
              </option>
            ))}
          </select>
        </div>

        {errorMsg && <div style={{ color: 'red', marginTop: '10px', padding: '10px', background: '#ffe6e6', borderRadius: '4px' }}>
          🚨 {errorMsg}
        </div>}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button onClick={() => setModalData(null)} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
        <button 
          onClick={confirmSchedule} 
          disabled={!modalData.roomId} // 👈 PREVENT SAVING WITHOUT A ROOM
          style={{ 
            padding: '8px 16px', 
            background: modalData.roomId ? '#28a745' : '#ccc', // Gray out if disabled
            color: 'white', border: 'none', cursor: modalData.roomId ? 'pointer' : 'not-allowed' 
          }}
        >
          Confirm & Save
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}