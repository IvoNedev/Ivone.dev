import React from 'react';

export function Card({ children }) {
    return (
        <div className="border rounded-lg shadow p-4 mb-4">
            {children}
        </div>
    );
}

export function CardContent({ children }) {
    return (
        <div className="p-2">
            {children}
        </div>
    );
}
