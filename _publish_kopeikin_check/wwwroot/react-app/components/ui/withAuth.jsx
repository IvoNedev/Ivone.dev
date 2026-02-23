// components/ui/withAuth.jsx
import React from 'react';
import Login from './login';

const withAuth = (WrappedComponent) => {
    return (props) => {
        const user = localStorage.getItem('user');
        if (!user) {
            return <Login />;
        }
        return <WrappedComponent {...props} />;
    };
};

export default withAuth;
