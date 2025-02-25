import React from 'react';

export function Input({ placeholder, value, onChange, type = 'text', className }) {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={`border rounded p-2 w-full ${className}`}
        />
    );
}
