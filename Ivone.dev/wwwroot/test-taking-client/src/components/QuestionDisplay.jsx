import React from 'react';
import { Card, CardContent, Typography, Grid, Paper, Box } from '@mui/material';

const QuestionDisplay = ({
    question,
    answered,
    selectedAnswerIds, // expects an array of selected answer IDs
    feedback,
    onAnswerClick,
    reservedHeight = 100, // Fixed space reserved for feedback/explanation
    highlightWrong = false, // New prop to trigger hardcore/hardcode highlighting mode
}) => {
    return (
        <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {question.text}
                </Typography>
                <Grid container spacing={2}>
                    {question.answers.map((answer) => {
                        let borderStyle = 'none';
                        let bgColor = 'inherit';

                        if (answered) {
                            if (highlightWrong) {
                                // In hardcore mode (either type), force highlighting based on answer correctness.
                                if (answer.isCorrect) {
                                    borderStyle = '2px solid green';
                                    bgColor = 'lightgreen';
                                } else if (selectedAnswerIds.includes(answer.id)) {
                                    borderStyle = '2px solid red';
                                    bgColor = 'lightcoral';
                                }
                            } else {
                                // Default post-submission styling.
                                if (answer.isCorrect) {
                                    borderStyle = '2px solid green';
                                    bgColor = 'lightgreen';
                                }
                                if (selectedAnswerIds.includes(answer.id) && !answer.isCorrect) {
                                    borderStyle = '2px solid red';
                                    bgColor = 'lightcoral';
                                }
                            }
                        } else {
                            // Before submission: if the answer is selected, highlight it in dark gray.
                            if (selectedAnswerIds.includes(answer.id)) {
                                bgColor = 'darkgray';
                            }
                        }

                        return (
                            <Grid item xs={12} sm={6} key={answer.id}>
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 2,
                                        border: borderStyle,
                                        backgroundColor: bgColor,
                                        cursor: answered ? 'default' : 'pointer',
                                        textAlign: 'center',
                                    }}
                                    onClick={() => onAnswerClick(answer)}
                                >
                                    <Typography variant="subtitle1">{answer.text}</Typography>
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
                {/* Reserved feedback area to avoid layout jumps */}
                <Box sx={{ mt: 2, minHeight: reservedHeight }}>
                    {answered && (
                        <>
                            <Typography variant="h6" color={feedback === 'correct' ? 'green' : 'red'}>
                                {feedback === 'correct' ? 'Correct!' : 'Wrong!'}
                            </Typography>
                            {question.explanation && (
                                <Typography variant="body1">{question.explanation}</Typography>
                            )}
                        </>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default QuestionDisplay;
