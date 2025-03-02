import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { decodeJwt } from 'jose'; 


const Login = () => {
    const handleSuccess = (response) => {
       

        const userObject = decodeJwt(response.credential); // Using jose's decodeJwt
        console.log(userObject.email); 
        localStorage.setItem('user', JSON.stringify(userObject));
        window.location.reload();
    };

    const handleFailure = () => {
        alert('Google Sign In was unsuccessful. Try again later');
    };

    return (
        <GoogleOAuthProvider clientId="401410826720-1vl5fnvuts7pu5mk5l3hovrgcemdoc7l.apps.googleusercontent.com">
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl mb-4">Login with Google</h2>
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={handleFailure}
                    />
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Login;
