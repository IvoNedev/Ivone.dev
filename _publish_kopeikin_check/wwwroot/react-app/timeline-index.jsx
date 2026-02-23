// timeline-index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import Timeline from './components/ui/timeline/Timeline';
import './components/ui/timeline/timeline.css'; // Create this file (even empty) or remove if not needed

// Get the data passed from your .NET page
const timelineData = window.appData || [];

// Grab the root element from the DOM
const rootElement = document.getElementById('timeline-root');
const root = createRoot(rootElement);

root.render(
    <React.StrictMode>
        <Timeline events={timelineData} />
    </React.StrictMode>
);
