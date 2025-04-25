import React from 'react';

export function Select({ children, value, onValueChange }) {
    return (
        <select
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="border rounded p-2 w-full"
        >
            {children}
        </select>
    );
}

export function SelectTrigger({ children }) {
    return (
        <option disabled>{children}</option>
    );
}

export function SelectContent({ children }) {
    return (
        <>
            {children}
        </>
    );
}

export function SelectItem({ value, children }) {
    return (
        <option value={value}>{children}</option>
    );
}
