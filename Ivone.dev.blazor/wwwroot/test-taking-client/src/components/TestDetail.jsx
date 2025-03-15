import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function TestDetail() {
    const { id } = useParams();
    const [test, setTest] = useState(null);

    useEffect(() => {
        // Fetch the test details from your API (adjust the endpoint as needed)
        fetch(`/api/tests/${id}`)
            .then((res) => res.json())
            .then((data) => setTest(data))
            .catch((err) => console.error("Error fetching test details:", err));
    }, [id]);

    if (!test) {
        return <div>Loading test details...</div>;
    }

    return (
        <div className="container">
            <h1>{test.title}</h1>
            <ul>
                {test.questions && test.questions.map((question) => (
                    <li key={question.id}>
                        {question.text}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default TestDetail;
