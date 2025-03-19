import React from 'react';
import { Container, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const navigate = useNavigate();
    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Typography variant="h3" align="center" gutterBottom>
                Dashboard
            </Typography>
            <Stack spacing={2} direction="column" alignItems="center">
                <Button variant="contained" fullWidth onClick={() => navigate('/tests')}>
                    Tests
                </Button>
                <Button variant="contained" fullWidth onClick={() => navigate('/endless')}>
                    Endless Mode
                </Button>
                <Button variant="contained" fullWidth onClick={() => navigate('/random')}>
                    Random Test
                </Button>
            </Stack>
        </Container>
    );
}

export default Dashboard;
