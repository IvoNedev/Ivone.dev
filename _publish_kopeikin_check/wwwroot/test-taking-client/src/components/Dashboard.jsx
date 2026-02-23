import React from 'react';
import { Container, Typography, Button, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}
        >
            <Container
                maxWidth="sm"
                sx={{
                    backgroundColor: 'white',
                    p: 4,
                    borderRadius: 2,
                    boxShadow: 3,
                }}
            >
                <Typography
                    variant="h3"
                    align="center"
                    gutterBottom
                    sx={{ fontWeight: 'bold', mb: 3 }}
                >
                    UK-Test
                </Typography>
                <Stack spacing={2} direction="column">
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => navigate('/tests')}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontSize: '1.1rem',
                            py: 1.5,
                        }}
                    >
                        Tests
                    </Button>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => navigate('/endless')}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontSize: '1.1rem',
                            py: 1.5,
                        }}
                    >
                        Endless Mode
                    </Button>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => navigate('/random')}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontSize: '1.1rem',
                            py: 1.5,
                        }}
                    >
                        Random Test
                    </Button>
                </Stack>
            </Container>
        </Box>
    );
}

export default Dashboard;
