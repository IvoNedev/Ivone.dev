import React from 'react';

export function RadioGroup({ value, onValueChange, children, className }) {
    return (
        <div className={`flex ${className}`}>
            {React.Children.map(children, (child) =>
                React.cloneElement(child, {
                    name: "radio-group",
                    checked: child.props.value === value,
                    onChange: () => onValueChange(child.props.value)
                })
            )}
        </div>
    );
}

export function RadioGroupItem({ value, children, name, checked, onChange }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="radio"
                value={value}
                name={name}
                checked={checked}
                onChange={onChange}
                className="cursor-pointer"
            />
            {children}
        </label>
    );
}
