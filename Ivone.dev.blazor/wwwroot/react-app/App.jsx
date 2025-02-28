import React, { useEffect, useState } from 'react';
import Login from '@/components/ui/Login';  // Import Login Component
import MortgageCalculator from '@/components/ui/MortgageCalculator'; // Your main app component

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.location.reload();
    };

    useEffect(() => {
        const user = localStorage.getItem('user');
        console.log(user);
        setIsAuthenticated(!!user);
        console.log(user);
    }, []);

    // Conditional Rendering
    if (!isAuthenticated) {
        return <Login />;
    } else {
        return <MortgageCalculator />;
    }
}
