import React, { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    Snackbar,
    Alert,
    Switch,
    FormControlLabel,
    Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import QuestionDisplay from './QuestionDisplay';

const Endless = () => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersRecord, setAnswersRecord] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState([]); // Current question's selections
    const [correctCount, setCorrectCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // Toggles for wrong-answer auto-reset modes
    const [hardcode, setHardcode] = useState(false);
    const [hardcoreRandom, setHardcoreRandom] = useState(false);

    const navigate = useNavigate();

    // Load questions and reset state
    const loadQuestions = () => {
        fetch('/api/tests/endless')
            .then((res) => res.json())
            .then((data) => {
                setQuestions(data);
                setCurrentIndex(0);
                setAnswersRecord(Array(data.length).fill(null));
                setSelectedAnswers([]);
                setCorrectCount(0);
                setTotalCount(0);
            })
            .catch((err) => console.error('Error fetching endless questions:', err));
    };

    useEffect(() => {
        loadQuestions();
    }, []);

    if (questions.length === 0) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography variant="h6" align="center">
                    Loading questions...
                </Typography>
            </Container>
        );
    }

    const currentQuestion = questions[currentIndex];
    const currentAnswerRecord = answersRecord[currentIndex];

    // Highlight wrong answers if answer recorded is wrong and either hardcore mode is active.
    const highlightWrong =
        currentAnswerRecord && !currentAnswerRecord.isCorrect && (hardcode || hardcoreRandom);

    // Determine correct answer IDs for the current question.
    const correctAnswers = currentQuestion.answers
        .filter((ans) => ans.isCorrect)
        .map((ans) => ans.id);
    const requiredSelections = correctAnswers.length;

    const handleAnswerClick = (answer) => {
        // Prevent changes if already answered.
        if (currentAnswerRecord !== null) return;

        setSelectedAnswers((prevSelected) => {
            let updatedSelections;
            if (prevSelected.includes(answer.id)) {
                // Deselect if already selected.
                updatedSelections = prevSelected.filter((id) => id !== answer.id);
            } else {
                // Add new selection.
                updatedSelections = [...prevSelected, answer.id];
            }

            // Auto-submit if the number of selections meets the required count.
            if (updatedSelections.length === requiredSelections) {
                handleAutoSubmit(updatedSelections);
            }
            return updatedSelections;
        });
    };

    const handleAutoSubmit = (selectedIds) => {
        // Check if selected answers exactly match the correct answer IDs.
        const isCorrect =
            selectedIds.length === correctAnswers.length &&
            selectedIds.every((id) => correctAnswers.includes(id));

        if (isCorrect) {
            // Record correct answer.
            const newRecord = [...answersRecord];
            newRecord[currentIndex] = { selectedAnswers: selectedIds, isCorrect };
            setAnswersRecord(newRecord);
            setTotalCount((prev) => prev + 1);
            setCorrectCount((prev) => prev + 1);
            setSnackbarMessage('Correct!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setTimeout(() => {
                setSnackbarOpen(false);
                handleNextQuestion();
            }, 300);
        } else {
            // Wrong answer branch.
            if (hardcoreRandom) {
                // In Hardcore Random, record the wrong answer, highlight it, and wait 2 seconds before refreshing questions.
                const newRecord = [...answersRecord];
                newRecord[currentIndex] = { selectedAnswers: selectedIds, isCorrect };
                setAnswersRecord(newRecord);
                setTotalCount((prev) => prev + 1);
                setSnackbarMessage('Wrong! Refreshing questions...');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                setTimeout(() => {
                    setSnackbarOpen(false);
                    loadQuestions();
                }, 2000);
            } else if (hardcode) {
                // In Hardcode mode, now also record the wrong answer so highlighting works.
                const newRecord = [...answersRecord];
                newRecord[currentIndex] = { selectedAnswers: selectedIds, isCorrect };
                setAnswersRecord(newRecord);
                setTotalCount((prev) => prev + 1);
                setSnackbarMessage('Wrong! Returning to first question...');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                setTimeout(() => {
                    setSnackbarOpen(false);
                    handleStartOver();
                }, 2000);
            } else {
                // Otherwise, simply record the wrong answer (no auto-reset).
                const newRecord = [...answersRecord];
                newRecord[currentIndex] = { selectedAnswers: selectedIds, isCorrect };
                setAnswersRecord(newRecord);
                setTotalCount((prev) => prev + 1);
            }
        }
    };

    const handleNextQuestion = () => {
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(currentIndex + 1);
            setSelectedAnswers([]); // Reset selections for the new question.
        } else {
            // Loop back to the first question if needed.
            setCurrentIndex(0);
            setSelectedAnswers([]);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setSelectedAnswers([]); // Reset selections when going back.
        }
    };

    const handleStartOver = () => {
        setCurrentIndex(0);
        setAnswersRecord(Array(questions.length).fill(null));
        setSelectedAnswers([]);
        setCorrectCount(0);
        setTotalCount(0);
    };

    const rollingPercentage =
        totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const percentageColor = rollingPercentage >= 75 ? 'green' : 'red';

    // Style "Previous Question" button based on the previous answer.
    let prevButtonStyles = {};
    if (currentIndex > 0 && answersRecord[currentIndex - 1]) {
        prevButtonStyles = {
            backgroundColor: answersRecord[currentIndex - 1].isCorrect ? 'green' : 'red',
            '&:hover': {
                backgroundColor: answersRecord[currentIndex - 1].isCorrect ? 'darkgreen' : 'darkred'
            }
        };
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            {/* Navigation Button */}
            <Box sx={{ mb: 2 }}>
                <Button variant="contained" color="primary" onClick={() => navigate('/')}>
                    Dashboard
                </Button>
            </Box>
            <Typography variant="h4" gutterBottom>
                Endless Mode
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
                All questions one after the other
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
                highlightWrong={highlightWrong} // Pass true for hardcore/hardcode modes
                onAnswerClick={handleAnswerClick}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                    variant="contained"
                    onClick={handlePreviousQuestion}
                    disabled={currentIndex === 0}
                    sx={prevButtonStyles}
                >
                    Previous Question
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNextQuestion}
                    disabled={currentAnswerRecord === null}
                >
                    Next Question
                </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button variant="outlined" color="error" onClick={handleStartOver}>
                    Start Over
                </Button>
            </Box>
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="subtitle1">
                    Questions Answered: {totalCount} | Correct: {correctCount} | Rolling %:{' '}
                    <span style={{ color: percentageColor }}>{rollingPercentage}%</span>
                </Typography>
                {/* Mode toggles with tooltips */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Tooltip title="Hardcode: Resets the entire test state on a wrong answer, clearing all previous responses.">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={hardcode}
                                    onChange={(e) => setHardcode(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Hardcode"
                        />
                    </Tooltip>
                    <Tooltip title="Hardcore Random: Records the wrong answer and refreshes questions on a wrong answer, waiting 2 seconds for feedback with the wrong answer highlighted.">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={hardcoreRandom}
                                    onChange={(e) => setHardcoreRandom(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Hardcore Random"
                        />
                    </Tooltip>
                </Box>
            </Box>

            <Snackbar
                open={snackbarOpen}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Endless;
