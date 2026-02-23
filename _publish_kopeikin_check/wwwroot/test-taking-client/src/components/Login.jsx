import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { decodeJwt } from 'jose';

const Login = () => {
    const handleSuccess = (response) => {
        const userObject = decodeJwt(response.credential);
        localStorage.setItem('user', JSON.stringify(userObject));
        window.location.href = '/';
    };

    const handleFailure = () => {
        alert('Google Sign In was unsuccessful. Try again later');
    };

    return (
        <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ padding: 20, background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.26)' }}>
                    <h2>Login with Google</h2>
                    <GoogleLogin onSuccess={handleSuccess} onError={handleFailure} />
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Login;
