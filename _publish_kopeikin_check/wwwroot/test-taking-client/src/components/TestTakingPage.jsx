import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdBanner from './AdBanner';
import {
    AppBar,
    Toolbar,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider,
    Container,
    Typography,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import QuestionDisplay from './QuestionDisplay';

const TestTakingPage = () => {
    const { id } = useParams(); // Get test ID from URL
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answersRecord, setAnswersRecord] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState([]); // Store selected answers
    const [score, setScore] = useState(0);
    const [quickMode, setQuickMode] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Load the Quick Mode setting from localStorage for this test
    useEffect(() => {
        const storedQuickMode = localStorage.getItem(`quickMode_${id}`);
        if (storedQuickMode) {
            setQuickMode(storedQuickMode === 'true');
        }
    }, [id]);

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
                updatedSelections = prevSelected.filter((ansId) => ansId !== answer.id);
            } else {
                updatedSelections = [...prevSelected, answer.id];
            }
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
            // If Quick Mode is enabled, automatically proceed to the next question after a short delay.
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
        localStorage.setItem("testResults", JSON.stringify(testResults));
        alert(`Test Finished! You scored ${score}/${test.questions.length} (${percentage}%)`);
        navigate('/tests');
    };

    // Handler for Quick Mode checkbox change
    const handleQuickModeChange = (event) => {
        const newValue = event.target.checked;
        setQuickMode(newValue);
        localStorage.setItem(`quickMode_${id}`, newValue);
    };

    // Handlers for the Drawer (burger menu)
    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setDrawerOpen(open);
    };

    const drawerContent = (
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => navigate('/')}>
                        <ListItemText primary="Dashboard" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => navigate('/tests')}>
                        <ListItemText primary="Back To Tests" />
                    </ListItemButton>
                </ListItem>
            </List>
            <Divider />
        </Box>
    );

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            {/* AppBar Header */}
            <AppBar position="static" color="default" sx={{ mb: 2 }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)} aria-label="menu">
                        <MenuIcon />
                    </IconButton>
                    <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
                        {drawerContent}
                    </Drawer>
                    <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
                        {test.title}
                    </Typography>
                    <Tooltip title="Correct answer automatically goes to next question">
                        <FormControlLabel
                            control={<Checkbox checked={quickMode} onChange={handleQuickModeChange} />}
                            label="Quick Mode"
                        />
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Second row: Question number and score */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                    Question {currentIndex + 1} of {test.questions.length}
                </Typography>
                <Typography variant="subtitle1">
                    Score: {score} / {test.questions.length}
                </Typography>
            </Box>

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

            {/* Ad Banner placed just above navigation buttons */}
            {/*<Box sx={{ width: '320px', height: '50px', mx: 'auto', my: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>*/}
            {/*    <AdBanner />*/}
            {/*</Box>*/}

            {/* Navigation Buttons */}
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
        </Container>
    );
};

export default TestTakingPage;
