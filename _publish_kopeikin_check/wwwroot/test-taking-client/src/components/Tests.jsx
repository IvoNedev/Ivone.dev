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
    Checkbox,
    FormControlLabel,
    Tooltip,
    AppBar,
    Toolbar,
    IconButton,
    Drawer,
    Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';

function Tests() {
    const [tests, setTests] = useState([]);
    const [testResults, setTestResults] = useState([]);
    const [quickModes, setQuickModes] = useState({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch tests from API
        fetch('/api/tests')
            .then((res) => res.json())
            .then((data) => setTests(data))
            .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
        // Load past test results from localStorage whenever tests change
        const storedResults = JSON.parse(localStorage.getItem('testResults')) || [];
        setTestResults(storedResults);
    }, [tests]);

    // When tests load, read the Quick Mode setting for each test from localStorage.
    useEffect(() => {
        const modes = {};
        tests.forEach((test) => {
            const stored = localStorage.getItem(`quickMode_${test.id}`);
            modes[test.id] = stored === 'true';
        });
        setQuickModes(modes);
    }, [tests]);

    // Handler for toggling Quick Mode for a specific test.
    const handleQuickModeChange = (testId, event) => {
        // Stop propagation so that clicking the checkbox doesn't trigger navigation.
        event.stopPropagation();
        const newValue = event.target.checked;
        setQuickModes((prev) => ({
            ...prev,
            [testId]: newValue,
        }));
        localStorage.setItem(`quickMode_${test.id}`, newValue); // Or use testId here.
    };

    // Helper function to get the best result from an array of results.
    const getBestResult = (results) => {
        if (!results || results.length === 0) return null;
        return results.reduce(
            (best, current) => (!best || current.percentage > best.percentage ? current : best),
            null
        );
    };

    // Today's midnight (local time)
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    // Drawer handlers
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

    return (
        <Container>
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
                        All Tests
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* List of Tests */}
            <List>
                {tests.map((test) => {
                    // Filter test results for this test based on matching testId.
                    const testResultsForTest = testResults.filter(
                        (result) => result.testId.toString() === test.id.toString()
                    );

                    // Compute the overall best result.
                    const overallTopResult = getBestResult(testResultsForTest);

                    // Filter today's results (based on timestamp).
                    const todaysResults = testResultsForTest.filter((result) => {
                        const resultTime = new Date(result.timestamp);
                        return resultTime >= todayMidnight;
                    });
                    const todaysTopResult = getBestResult(todaysResults);

                    return (
                        <ListItem key={test.id} disablePadding>
                            <ListItemButton onClick={() => navigate(`/tests/${test.id}`)}>
                                <ListItemText primary={test.title} />
                                <Box sx={{ ml: 2, textAlign: 'right' }}>
                                    <Typography
                                        variant="body2"
                                        color={overallTopResult && overallTopResult.percentage < 75 ? 'red' : 'green'}
                                    >
                                        Score:{" "}
                                        {overallTopResult
                                            ? `${overallTopResult.score}/${overallTopResult.total} (${overallTopResult.percentage}%)`
                                            : "No score yet"}
                                    </Typography>
                                    <Tooltip title="Correct answer automatically goes to next question">
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={quickModes[test.id] || false}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={(event) => handleQuickModeChange(test.id, event)}
                                                />
                                            }
                                            label="Quick Mode"
                                        />
                                    </Tooltip>
                                </Box>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Container>
    );
}

export default Tests;
