import React, { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Box,
    Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Tests() {
    const [tests, setTests] = useState([]);
    const [testResults, setTestResults] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch tests from API
        fetch('/api/tests')
            .then((res) => res.json())
            .then((data) => setTests(data))
            .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
        // Load past test results from localStorage whenever tests change (ensures latest scores)
        const storedResults = JSON.parse(localStorage.getItem('testResults')) || [];
        console.log(storedResults);
        setTestResults(storedResults);
    }, [tests]);

    return (
        <Container>
            {/* Dashboard Button */}
            <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                onClick={() => navigate('/')}
            >
                Dashboard
            </Button>
            <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
                Available Tests
            </Typography>
            <List>
                {tests.map((test) => {
                    // Convert both IDs to strings for comparison
                    const pastResult = testResults.find(
                        (result) => result.testId.toString() === test.id.toString()
                    );
                    return (
                        <ListItem key={test.id} disablePadding>
                            <ListItemButton onClick={() => navigate(`/tests/${test.id}`)}>
                                <ListItemText primary={test.title} />
                                {pastResult && (
                                    <Box sx={{ ml: 2 }}>
                                        <Typography
                                            variant="body2"
                                            color={pastResult.percentage < 75 ? 'red' : 'green'}
                                        >
                                            Score: {pastResult.score}/{pastResult.total} ({pastResult.percentage}
                                            %)
                                        </Typography>
                                    </Box>
                                )}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Container>
    );
}

export default Tests;
