import React, { useEffect, useState } from 'react';
import AdBanner from './AdBanner';
import {
    Container,
    Typography,
    Box,
    Button,
    Snackbar,
    Alert,
    Switch,
    FormControlLabel,
    Tooltip,
    AppBar,
    Toolbar,
    IconButton,
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
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

    // State for Drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navigate = useNavigate();

    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) return;
        setDrawerOpen(open);
    };

    const drawerContent = (
        <Box
            sx={{ width: 250 }}
            role="presentation"
            onClick={toggleDrawer(false)}
            onKeyDown={toggleDrawer(false)}
        >
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => navigate('/')}>
                        <ListItemText primary="Dashboard" />
                    </ListItemButton>
                </ListItem>
            </List>
            <Divider />
        </Box>
    );

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
            {/* AppBar Header with Burger Menu */}
            <AppBar position="static" color="default" sx={{ mb: 2 }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)} aria-label="menu">
                        <MenuIcon />
                    </IconButton>
                    <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
                        {drawerContent}
                    </Drawer>
                    <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
                        Endless Mode
                        <br />
                        <span style={{ fontSize: "small" }}>(All questions one after the other)</span>

                    </Typography>
                </Toolbar>
            </AppBar>

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
            {/*<Box sx={{ width: '320px', height: '100px', mx: 'auto', my: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>*/}
            {/*    <AdBanner />*/}
            {/*</Box>*/}
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
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Tooltip title="Goes back to Question 1 if a wrong answer is given">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={hardcode}
                                    onChange={(e) => setHardcode(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Hardcore"
                        />
                    </Tooltip>
                    <Tooltip title="Starts over from a random Question 1">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={hardcoreRandom}
                                    onChange={(e) => setHardcoreRandom(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Random Hardcore"
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
