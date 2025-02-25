import React, { useState, useEffect } from "react";

const Table = ({ columns, data, renderCell }) => {
    const [isMobile, setIsMobile] = useState(false);
    // Detect screen size
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        handleResize(); // Check on initial render
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (isMobile && columns.length>5) {        
        // Mobile View: Portrait Layout
        const transposedData = columns.slice(1).map((colHeader, colIndex) => {
            const row = [colHeader];
            data.forEach(rowData => row.push(rowData[colIndex + 1]));
            return row;
        });

        return (
            <table className="table-auto w-full text-left border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-gray-300 p-2">{columns[0]}</th>
                        {data.map((_, colIndex) => (
                            <th key={colIndex} className="border border-gray-300 p-2">
                                {data[colIndex][0]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {transposedData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="border border-gray-300 p-2"
                                >
                                    {renderCell ? renderCell(cell, rowIndex, cellIndex) : cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    // Desktop View: Landscape Layout
    return (
        <table className="table-auto w-full text-left border-collapse border border-gray-300">
            <thead className="bg-gray-100">
                <tr>
                    {columns.map((col, index) => (
                        <th key={index} className="border border-gray-300 p-2">
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                            <td
                                key={cellIndex}
                                className="border border-gray-300 p-2"
                            >
                                {renderCell ? renderCell(cell, rowIndex, cellIndex) : cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default Table;
