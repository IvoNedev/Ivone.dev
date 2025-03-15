import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button } from '@mui/material';
import QuestionDisplay from './QuestionDisplay';

const TestTakingPage = () => {
    const { id } = useParams(); // Get test ID from URL
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersRecord, setAnswersRecord] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState([]); // Store selected answers
    const [score, setScore] = useState(0);

    useEffect(() => {
        fetch(`/api/tests/${id}`)
            .then((res) => res.json())
            .then((data) => {
                setTest(data);
                setCurrentIndex(0);
                setAnswersRecord(Array(data.questions.length).fill(null));
                setScore(0);
                setSelectedAnswers([]);
            })
            .catch((err) => console.error("Error fetching test data:", err));
    }, [id]);

    if (!test) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography variant="h6" align="center">
                    Loading test...
                </Typography>
            </Container>
        );
    }

    const currentQuestion = test.questions[currentIndex];
    const currentAnswerRecord = answersRecord[currentIndex];

    // Get correct answers for this question
    const correctAnswers = currentQuestion.answers
        .filter((ans) => ans.isCorrect)
        .map((ans) => ans.id);
    const requiredSelections = correctAnswers.length; // Number of selections needed before auto-submitting

    // Handle answer selection
    const handleAnswerClick = (answer) => {
        if (currentAnswerRecord !== null) return; // Prevent changes after submission

        setSelectedAnswers((prevSelected) => {
            let updatedSelections;
            if (prevSelected.includes(answer.id)) {
                // Deselect answer if already selected
                updatedSelections = prevSelected.filter((ansId) => ansId !== answer.id);
            } else {
                // Select new answer
                updatedSelections = [...prevSelected, answer.id];
            }

            // Auto-submit when the required number of answers are selected
            if (updatedSelections.length === requiredSelections) {
                handleAutoSubmit(updatedSelections);
            }

            return updatedSelections;
        });
    };

    // Auto-submit when all required answers are selected
    const handleAutoSubmit = (selectedAnswers) => {
        const isCorrect =
            selectedAnswers.length === correctAnswers.length &&
            selectedAnswers.every((ansId) => correctAnswers.includes(ansId));

        const newRecord = [...answersRecord];
        newRecord[currentIndex] = { selectedAnswers, isCorrect };
        setAnswersRecord(newRecord);

        if (isCorrect) {
            setScore((prev) => prev + 1);
        }
    };

    const handleNextQuestion = () => {
        if (currentIndex + 1 < test.questions.length) {
            setCurrentIndex(currentIndex + 1);
            setSelectedAnswers([]); // Reset selections for the next question
        }
    };

    const handlePreviousQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setSelectedAnswers([]); // Reset selections when going back
        }
    };

    const handleFinishTest = () => {
        const percentage = Math.round((score / test.questions.length) * 100);

        // Retrieve previous test results
        const testResults = JSON.parse(localStorage.getItem("testResults")) || [];

        // Check if this test already exists
        const existingIndex = testResults.findIndex((result) => result.testId === id);

        const newResult = {
            testId: id,
            title: test.title,
            score: score,
            total: test.questions.length,
            percentage: percentage,
        };

        if (existingIndex !== -1) {
            testResults[existingIndex] = newResult; // Update existing test result
        } else {
            testResults.push(newResult); // Add new test result
        }

        // Save to localStorage
        localStorage.setItem("testResults", JSON.stringify(testResults));

        // Show results and navigate
        alert(`Test Finished! You scored ${score}/${test.questions.length} (${percentage}%)`);
        navigate('/tests');
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button variant="contained" color="primary" onClick={() => navigate('/')}>
                    Dashboard
                </Button>
                <Button variant="contained" color="secondary" onClick={() => navigate('/tests')}>
                    Back To Tests
                </Button>
            </Box>
            <Typography variant="h4" gutterBottom>
                {test.title}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Question {currentIndex + 1} of {test.questions.length}
            </Typography>
            <QuestionDisplay
                question={currentQuestion}
                answered={currentAnswerRecord !== null}
                selectedAnswerIds={selectedAnswers}
                feedback={
                    currentAnswerRecord
                        ? currentAnswerRecord.isCorrect
                            ? "correct"
                            : "wrong"
                        : null
                }
                onAnswerClick={handleAnswerClick}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handlePreviousQuestion}
                    disabled={currentIndex === 0}
                >
                    Previous Question
                </Button>
                {currentIndex + 1 < test.questions.length ? (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleNextQuestion}
                        disabled={currentAnswerRecord === null} // Prevent skipping without answering
                    >
                        Next Question
                    </Button>
                ) : (
                    <Button variant="contained" color="success" onClick={handleFinishTest}>
                        Finish Test
                    </Button>
                )}
            </Box>
            <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1">
                    Score: {score} / {test.questions.length}
                </Typography>
            </Box>
        </Container>
    );
};

export default TestTakingPage;
