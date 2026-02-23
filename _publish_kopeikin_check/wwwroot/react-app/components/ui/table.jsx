import React, { useState, useEffect } from "react";

const Table = ({ columns, data, renderCell, getRowStyle, id }) => {
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

    const determineCurrencyClass = (cellIndex) => {
        // Transposed layout: column 1 is EUR, column 2 is BGN
        if (cellIndex === 1) return "eur";
        if (cellIndex === 2) return "bgn";
        return "";
    };


    // Helper function to determine currency class
    const getCurrencyClass = (row, rowIndex, cellIndex) => {
        // On desktop, rows directly correspond to currencies
        if (!isMobile) {
            if (rowIndex === 0 && cellIndex > 0) return "eur";
            if (rowIndex === 1 && cellIndex > 0) return "bgn";
        }

        // On mobile, use the original data structure for currency
        if (isMobile && cellIndex === 0) {
            const originalColumnIndex = rowIndex + 1; // Data transposition shifts rows to columns
            if (data[originalColumnIndex]?.[0]?.includes("EUR")) return "eur";
            if (data[originalColumnIndex]?.[0]?.includes("BGN")) return "bgn";
        }

        return "";
    };

    if (isMobile && columns.length > 5) {
        // Mobile View: Transposed Layout
        const transposedData = columns.slice(1).map((colHeader, colIndex) => {
            const row = [colHeader];
            data.forEach(rowData => row.push(rowData[colIndex + 1]));
            return row;
        });

        return (
            <table id={id} className="table-auto w-full text-left border-collapse border border-gray-300">
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
                                    className={`border border-gray-300 p-2 ${determineCurrencyClass(cellIndex)}`}
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

    // Desktop View: Standard Layout
    return (
        <table id={id} className="table-auto w-full text-left border-collapse border border-gray-300">
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
                    <tr
                        key={rowIndex}
                        className={getRowStyle ? getRowStyle(row, rowIndex) : ''}
                    >
                        {row.map((cell, cellIndex) => (
                            <td
                                key={cellIndex}
                                className={`border border-gray-300 p-2 ${getCurrencyClass(row, rowIndex, cellIndex)}`}
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
