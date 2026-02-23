import React from 'react';

export function Card({ children }) {
    return (
        <div className="border rounded-lg shadow p-2 mb-2">
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
