import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Tests from './components/Tests';
import TestTakingPage from './components/TestTakingPage';
import Endless from './components/Endless';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/tests/:id" element={<TestTakingPage />} />
            <Route path="/endless" element={<Endless />} />
        </Routes>
    );
}

export default App;
