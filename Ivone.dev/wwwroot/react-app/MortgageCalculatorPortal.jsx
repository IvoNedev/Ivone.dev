import React, { useEffect, useState } from 'react';
import Login from '@/components/ui/Login';  // Import Login Component
import MortgageCalculator from '@/components/ui/MortgageCalculator'; // Your main app component

export default function MortgageCalculatorPortal() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.location.reload();
    };

    useEffect(() => {
        const user = localStorage.getItem('user');
        const jsonUser = JSON.parse(localStorage.getItem('user')); // Convert from string to object

        if (user) {
            const jsonUser = JSON.parse(user);

            // Call API to create the user
            fetch(`/api/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: jsonUser.email,
                    isGoogle: true, // Assuming Google login
                    isFacebook: false,
                    isLinkedIn: false,
                    isLocal: false,
                    hasPaid: false // Default value
                })
            })
                .then(response => {
                    if (response.ok) {
                        console.log("User created or already exists");
                    } else {
                        console.error("Error creating user");
                    }
                })
                .catch(error => console.error("Error:", error));

            setIsAuthenticated(true);
        }
      
    }, []);

    // Conditional Rendering
    //if (!isAuthenticated) {
    //    return <Login />;
    //} else {
        return <MortgageCalculator />;
    //}
}
