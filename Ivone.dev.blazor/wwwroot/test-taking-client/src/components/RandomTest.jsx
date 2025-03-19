import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Tooltip,
} from '@mui/material';
import QuestionDisplay from './QuestionDisplay';

const RandomTest = () => {
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersRecord, setAnswersRecord] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [quickMode, setQuickMode] = useState(false);

    // Load quick mode setting for "Random" test (use a unique key)
    useEffect(() => {
        const storedQuickMode = localStorage.getItem('quickMode_random');
        if (storedQuickMode) {
            setQuickMode(storedQuickMode === 'true');
        }
    }, []);

    // Fetch random questions from API endpoint that returns all questions in random order.
    useEffect(() => {
        fetch('/api/tests/endless')
            .then((res) => res.json())
            .then((data) => {
                // Take the first 24 questions from the randomized list.
                const questions = data.slice(0, 24);
                const randomTest = {
                    id: 'random',
                    title: 'Random Test',
                    questions: questions,
                };
                setTest(randomTest);
                setCurrentIndex(0);
                setAnswersRecord(Array(questions.length).fill(null));
                setScore(0);
                setSelectedAnswers([]);
            })
            .catch((err) => console.error('Error fetching random test data:', err));
    }, []);

    if (!test) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography variant="h6" align="center">
                    Loading random test...
                </Typography>
            </Container>
        );
    }

    const currentQuestion = test.questions[currentIndex];
    const currentAnswerRecord = answersRecord[currentIndex];

    // Get correct answer IDs for the current question.
    const correctAnswers = currentQuestion.answers
        .filter((ans) => ans.isCorrect)
        .map((ans) => ans.id);
    const requiredSelections = correctAnswers.length;

    // Handle answer selection.
    const handleAnswerClick = (answer) => {
        if (currentAnswerRecord !== null) return; // Prevent changes after submission

        setSelectedAnswers((prevSelected) => {
            let updatedSelections;
            if (prevSelected.includes(answer.id)) {
                updatedSelections = prevSelected.filter((id) => id !== answer.id);
            } else {
                updatedSelections = [...prevSelected, answer.id];
            }
            if (updatedSelections.length === requiredSelections) {
                handleAutoSubmit(updatedSelections);
            }
            return updatedSelections;
        });
    };

    // Auto-submit logic.
    const handleAutoSubmit = (selectedAnswers) => {
        const isCorrect =
            selectedAnswers.length === correctAnswers.length &&
            selectedAnswers.every((id) => correctAnswers.includes(id));

        const newRecord = [...answersRecord];
        newRecord[currentIndex] = { selectedAnswers, isCorrect };
        setAnswersRecord(newRecord);

        if (isCorrect) {
            setScore((prev) => prev + 1);
            if (quickMode) {
                setTimeout(() => {
                    if (currentIndex + 1 < test.questions.length) {
                        handleNextQuestion();
                    }
                }, 300);
            }
        }
    };

    const handleNextQuestion = () => {
        if (currentIndex + 1 < test.questions.length) {
            setCurrentIndex(currentIndex + 1);
            setSelectedAnswers([]);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setSelectedAnswers([]);
        }
    };

    const handleFinishTest = () => {
        const percentage = Math.round((score / test.questions.length) * 100);

        // Save the new result (appended with a timestamp).
        const testResults = JSON.parse(localStorage.getItem('testResults')) || [];
        const newResult = {
            testId: 'random',
            title: test.title,
            score: score,
            total: test.questions.length,
            percentage: percentage,
            timestamp: new Date().toISOString(),
        };
        testResults.push(newResult);
        localStorage.setItem('testResults', JSON.stringify(testResults));

        alert(`Test Finished! You scored ${score}/${test.questions.length} (${percentage}%)`);
        navigate('/tests');
    };

    const handleQuickModeChange = (event) => {
        const newValue = event.target.checked;
        setQuickMode(newValue);
        localStorage.setItem('quickMode_random', newValue);
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button variant="contained" color="primary" onClick={() => navigate('/')}>
                    Dashboard
                </Button>
                <Button variant="contained" color="secondary" onClick={() => navigate('/tests')}>
                    Back To Tests
                </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">
                    {test.title}
                </Typography>
                <Tooltip title="Correct answer automatically goes to next question">
                    <FormControlLabel
                        control={<Checkbox checked={quickMode} onChange={handleQuickModeChange} />}
                        label="Quick Mode"
                    />
                </Tooltip>
            </Box>
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
                            ? 'correct'
                            : 'wrong'
                        : null
                }
                onAnswerClick={handleAnswerClick}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button variant="contained" color="secondary" onClick={handlePreviousQuestion} disabled={currentIndex === 0}>
                    Previous Question
                </Button>
                {currentIndex + 1 < test.questions.length ? (
                    <Button variant="contained" color="primary" onClick={handleNextQuestion} disabled={currentAnswerRecord === null}>
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

export default RandomTest;
