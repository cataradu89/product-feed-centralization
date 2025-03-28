'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../lib/api';
import { Typography, Box, CircularProgress } from '@mui/material';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // In production, always redirect to dashboard without login
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'production') {
      router.push('/dashboard');
      return;
    }

    // In development, check if user is logged in, redirect accordingly
    const user = authService.getCurrentUser();
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Redirecting...
      </Typography>
    </Box>
  );
}
