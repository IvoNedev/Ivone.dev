import React, { useEffect, useState } from 'react';
import withAuth from '../withAuth';

// Helper to format a date string for datetime-local input (using local time)
const formatForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const pad = (num) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const TimelineEvent = ({ event, onEdit, onDelete }) => {
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const hours = eventDate.getHours();
    const minutes = eventDate.getMinutes();
    const showTime = (hours !== 0 || minutes !== 0);
    const formattedTime = showTime
        ? eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <div className="flex mb-8 items-start">
            <div className="w-1/4 pr-4 text-right">
                <div className="inline-block bg-indigo-500 text-white px-3 py-1 rounded-full font-bold">
                    {formattedDate}
                </div>
            </div>
            <div className="w-3/4 pl-4 border-l-4 border-gray-300">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-semibold">{event.title}</h3>
                    <div className="flex space-x-2">
                        <button onClick={() => onEdit(event)} title="Edit">
                            <span role="img" aria-label="edit">✏️</span>
                        </button>
                        <button onClick={() => onDelete(event)} title="Delete">
                            <span role="img" aria-label="delete">❌</span>
                        </button>
                    </div>
                </div>
                <p className="text-gray-700">{event.notes}</p>
                {event.address && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline"
                    >
                        + Google Maps
                    </a>
                )}
                {showTime && (
                    <div className="text-sm text-gray-500">{formattedTime}</div>
                )}
            </div>
        </div>
    );
};

const Timeline = () => {
    const [timelines, setTimelines] = useState([]);
    const [selectedTimelineId, setSelectedTimelineId] = useState(null);
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentEvent, setCurrentEvent] = useState({ date: '', title: '', notes: '', address: '' });
    const [isAddress, setIsAddress] = useState(false);
    const [shareEmail, setShareEmail] = useState('');

    // Get stored user from localStorage
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const [userId, setUserId] = useState(null);

    // Fetch user id by email from API
    useEffect(() => {
        if (user && user.email) {
            fetch(`/api/users/byEmail?email=${encodeURIComponent(user.email)}`)
                .then(res => {
                    if (!res.ok) throw new Error("User not found");
                    return res.json();
                })
                .then(data => {
                    setUserId(data.id);
                })
                .catch(error => console.error("Error fetching user id:", error));
        }
    }, [user]);

    // Load timelines for the user when userId is available.
    // The API will auto-create a default timeline if none exists.
    useEffect(() => {
        if (userId) {
            fetch(`/api/timeline/user/${userId}`)
                .then((res) => res.json())
                .then((data) => {
                    setTimelines(data);
                    if (data.length > 0) {
                        setSelectedTimelineId(data[0].id);
                    }
                })
                .catch(error => console.error("Error fetching timelines:", error));
        }
    }, [userId]);

    // Load events when selected timeline changes
    useEffect(() => {
        if (selectedTimelineId) {
            fetch(`/api/timeline/${selectedTimelineId}/events`)
                .then((res) => res.json())
                .then((data) => setEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date))))
                .catch(error => console.error("Error fetching events:", error));
        }
    }, [selectedTimelineId]);

    // Modal handling
    const openAddModal = () => {
        setModalMode('add');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setCurrentEvent({ date: today.toISOString(), title: '', notes: '', address: '' });
        setIsAddress(false);
        setIsModalOpen(true);
    };

    const openEditModal = (event) => {
        setModalMode('edit');
        setCurrentEvent(event);
        setIsAddress(!!(event.address && event.address.trim() !== ''));
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);
    const handleOverlayClick = () => closeModal();
    const handleModalClick = (e) => e.stopPropagation();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name === 'isAddress') {
            setIsAddress(checked);
            if (!checked) {
                setCurrentEvent(prev => ({ ...prev, address: '' }));
            }
        } else {
            setCurrentEvent(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async () => {
        const eventToSave = { ...currentEvent, address: isAddress ? currentEvent.address : '' };

        if (modalMode === 'add') {
            const response = await fetch(`/api/timeline/${selectedTimelineId}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventToSave),
            });
            if (response.ok) {
                const newEvent = await response.json();
                setEvents([...events, newEvent].sort((a, b) => new Date(a.date) - new Date(b.date)));
            }
        } else {
            const response = await fetch(`/api/timeline/events/${currentEvent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventToSave),
            });
            if (response.ok) {
                const updatedEvents = events.map(ev => ev.id === currentEvent.id ? eventToSave : ev);
                setEvents(updatedEvents.sort((a, b) => new Date(a.date) - new Date(b.date)));
            }
        }
        closeModal();
    };

    const handleDelete = async (event) => {
        if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
            const response = await fetch(`/api/timeline/events/${event.id}`, { method: 'DELETE' });
            if (response.ok) {
                setEvents(events.filter(ev => ev.id !== event.id));
            }
        }
    };

    // Sharing functionality: call API to share timeline with another user by email.
    const handleShare = async () => {
        const targetUserId = prompt("Enter target user's ID to share with:");
        if (!targetUserId) return;
        await fetch(`/api/timeline/share?timelineId=${selectedTimelineId}&userId=${targetUserId}`, { method: 'POST' });
        alert('Timeline shared!');
    };

    // Build timeline events with month separators
    let lastMonth = '';
    const eventElements = [];
    events.forEach((event, index) => {
        const eventDate = new Date(event.date);
        const eventMonth = eventDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
        if (eventMonth !== lastMonth) {
            eventElements.push(
                <div className="mb-4" key={`separator-${index}`}>
                    <hr className="border-t border-gray-300" />
                    <div className="text-center text-gray-600 mt-2">{eventMonth}</div>
                </div>
            );
            lastMonth = eventMonth;
        }
        eventElements.push(
            <TimelineEvent key={event.id} event={event} onEdit={openEditModal} onDelete={handleDelete} />
        );
    });

    return (
        <div className="container mx-auto px-6 py-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold">My Timelines</h1>
                    {/* Timeline dropdown */}
                    <select
                        value={selectedTimelineId || ''}
                        onChange={(e) => setSelectedTimelineId(Number(e.target.value))}
                        className="border p-2 rounded mt-2"
                    >
                        {timelines.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex space-x-4">
                    <button onClick={openAddModal} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                        Add New
                    </button>
                    <button onClick={handleShare} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Share
                    </button>
                </div>
            </div>
            <div className="flex">
                <div className="w-1/4 relative">
                    <div className="absolute top-0 bottom-0 right-0 border-l-4 border-indigo-500"></div>
                </div>
                <div className="w-3/4">{eventElements}</div>
            </div>

            {/* Modal for Add/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" onClick={() => closeModal()}>
                    <div className="bg-white rounded p-6 w-96" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">{modalMode === 'add' ? 'Add New Event' : 'Edit Event'}</h2>
                        <label className="block mb-2">
                            Date &amp; Time:
                            <input
                                type="datetime-local"
                                name="date"
                                value={formatForInput(currentEvent.date)}
                                onChange={handleChange}
                                className="border rounded px-2 py-1 w-full"
                            />
                        </label>
                        <label className="block mb-2">
                            Title:
                            <input
                                type="text"
                                name="title"
                                value={currentEvent.title}
                                onChange={handleChange}
                                className="border rounded px-2 py-1 w-full"
                            />
                        </label>
                        <label className="block mb-2">
                            Notes:
                            <textarea
                                name="notes"
                                value={currentEvent.notes}
                                onChange={handleChange}
                                className="border rounded px-2 py-1 w-full"
                            />
                        </label>
                        <label className="block mb-2">
                            <input
                                type="checkbox"
                                name="isAddress"
                                checked={isAddress}
                                onChange={handleChange}
                                className="mr-2"
                            />
                            Is address
                        </label>
                        {isAddress && (
                            <label className="block mb-4">
                                Address:
                                <input
                                    type="text"
                                    name="address"
                                    value={currentEvent.address}
                                    onChange={handleChange}
                                    className="border rounded px-2 py-1 w-full"
                                />
                            </label>
                        )}
                        <div className="flex justify-end space-x-4">
                            <button onClick={closeModal} className="px-4 py-2 border rounded">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded">
                                {modalMode === 'add' ? 'Add' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default withAuth(Timeline);
