import React, { useState, useEffect } from "react";
import axios from "axios";

const ScheduleBuilder = () => {
  const [options, setOptions] = useState({
    teachers: [],
    rooms: [],
    sections: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    teacherId: "",
    roomId: "",
    sectionId: "",
    dayOfWeek: "Monday",
    startTime: "08:00",
    endTime: "09:30",
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await axios.get("/api/schedules/options");

        console.log("API Response:", res.data);

        if (res.data.success) {
          setOptions({
            teachers: res.data.data.teachers || [],
            rooms: res.data.data.rooms || [],
            sections: res.data.data.sections || [],
          });
        } else {
          setError("Failed to load schedule options.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("/api/schedules", formData);
      alert("Schedule created successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to create schedule.");
    }
  };

  if (loading) return <div className="p-6">Loading schedule options...</div>;

  if (error)
    return (
      <div className="p-6 text-red-600 font-semibold">
        {error}
      </div>
    );

  return (
    <div className="p-8 bg-white rounded-lg shadow">

      <h2 className="text-2xl font-bold mb-4">
        Create New Schedule
      </h2>

      {/* Debug Information */}
      <div className="mb-4 p-3 bg-gray-100 rounded">
        <p>Teachers Loaded: {options.teachers.length}</p>
        <p>Rooms Loaded: {options.rooms.length}</p>
        <p>Sections Loaded: {options.sections.length}</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">

        {/* Teacher */}
        <select
          value={formData.teacherId}
          onChange={(e) =>
            setFormData({
              ...formData,
              teacherId: e.target.value,
            })
          }
          className="border rounded p-2"
        >
          <option value="">Select Teacher</option>

          {options.teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.user.firstName} {teacher.user.lastName}
            </option>
          ))}
        </select>

        {/* Room */}
        <select
          value={formData.roomId}
          onChange={(e) =>
            setFormData({
              ...formData,
              roomId: e.target.value,
            })
          }
          className="border rounded p-2"
        >
          <option value="">Select Room</option>

          {options.rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>

        {/* Section */}
        <select
          value={formData.sectionId}
          onChange={(e) =>
            setFormData({
              ...formData,
              sectionId: e.target.value,
            })
          }
          className="border rounded p-2"
        >
          <option value="">Select Section</option>

          {options.sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>

        {/* Day */}
        <select
          value={formData.dayOfWeek}
          onChange={(e) =>
            setFormData({
              ...formData,
              dayOfWeek: e.target.value,
            })
          }
          className="border rounded p-2"
        >
          <option>Monday</option>
          <option>Tuesday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
          <option>Saturday</option>
        </select>

        {/* Start Time */}
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) =>
            setFormData({
              ...formData,
              startTime: e.target.value,
            })
          }
          className="border rounded p-2"
        />

        {/* End Time */}
        <input
          type="time"
          value={formData.endTime}
          onChange={(e) =>
            setFormData({
              ...formData,
              endTime: e.target.value,
            })
          }
          className="border rounded p-2"
        />

        <button
          type="submit"
          className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white rounded p-3"
        >
          Create Schedule
        </button>

      </form>
    </div>
  );
};

export default ScheduleBuilder;