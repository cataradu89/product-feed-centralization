'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Typography, 
  Box, 
  Container, 
  Paper, 
  Button,
  CircularProgress,
  Grid,
  Chip,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { importHistoryService } from '@/lib/api';
import { toast } from 'react-hot-toast';

const statusColors = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'error'
};

export default function ImportDetails({ params }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [importDetails, setImportDetails] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const { id } = params;

  // Funcție pentru formatarea duratei
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes} minutes, ${remainingSeconds} seconds`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hours, ${minutes} minutes`;
    }
  };

  // Funcție pentru formatarea datei
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Încarcă detaliile importului
  const fetchImportDetails = async () => {
    try {
      setLoading(true);
      const data = await importHistoryService.getImportHistoryById(id);
      setImportDetails(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching import details:', error);
      toast.error('Failed to load import details');
      setLoading(false);
    }
  };

  // Inițializează componenta
  useEffect(() => {
    fetchImportDetails();
    
    // Configurăm refresh automat pentru importurile în curs
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [id]);

  // Configurează refresh automat dacă importul este în curs
  useEffect(() => {
    if (importDetails && (importDetails.status === 'pending' || importDetails.status === 'processing')) {
      // Dacă importul este în curs, refreshăm la fiecare 3 secunde
      const interval = setInterval(() => {
        fetchImportDetails();
      }, 3000);
      
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else if (refreshInterval) {
      // Dacă importul s-a terminat, oprim refresh-ul automat
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [importDetails]);

  // Navigare înapoi la lista de importuri
  const handleBack = () => {
    router.push('/dashboard/feed-imports');
  };

  // Refresh manual
  const handleRefresh = () => {
    fetchImportDetails();
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!importDetails) {
    return (
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Import History
        </Button>
        <Alert severity="error">Import details not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Import Details
          </Typography>
          <IconButton 
            onClick={handleRefresh} 
            sx={{ ml: 2 }}
            title="Refresh"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
        <Typography variant="body1" color="text.secondary" paragraph>
          Detailed information for feed import #{id.substring(0, 8)}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Feed Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography>
                <strong>Feed Name:</strong> {importDetails.feedName}
              </Typography>
              <Typography>
                <strong>Status:</strong>{' '}
                <Chip 
                  label={importDetails.status.charAt(0).toUpperCase() + importDetails.status.slice(1)}
                  color={statusColors[importDetails.status]}
                  size="small"
                />
              </Typography>
              <Typography>
                <strong>Started At:</strong> {formatDate(importDetails.startTime)}
              </Typography>
              <Typography>
                <strong>Completed At:</strong> {formatDate(importDetails.endTime) || '-'}
              </Typography>
              <Typography>
                <strong>Duration:</strong> {formatDuration(importDetails.duration)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Import Results
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography>
                <strong>Total Processed:</strong> {importDetails.totalProcessed || 0}
              </Typography>
              <Typography>
                <strong>New Products:</strong> {importDetails.inserted || 0}
              </Typography>
              <Typography>
                <strong>Updated Products:</strong> {importDetails.updated || 0}
              </Typography>
              <Typography>
                <strong>Deactivated Products:</strong> {importDetails.deactivated || 0}
              </Typography>
              <Typography>
                <strong>Errors:</strong> {importDetails.errors || 0}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {importDetails.status === 'processing' && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography variant="h6">
                Import in progress
              </Typography>
            </Box>
            <Typography sx={{ mt: 1 }}>
              Currently processed {importDetails.totalProcessed || 0} products.
              The page will automatically refresh when there are updates.
            </Typography>
          </CardContent>
        </Card>
      )}

      {importDetails.errorDetails && importDetails.errorDetails.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Error Details
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Index</TableCell>
                  <TableCell>Error</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Title</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importDetails.errorDetails.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.index || '-'}</TableCell>
                    <TableCell>{error.error}</TableCell>
                    <TableCell>
                      {error.url !== 'unknown' && error.url !== 'system' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton 
                            size="small" 
                            href={error.url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open URL"
                          >
                            <LinkIcon fontSize="small" />
                          </IconButton>
                          <Typography variant="body2" sx={{ ml: 1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {error.url}
                          </Typography>
                        </Box>
                      ) : (
                        error.url
                      )}
                    </TableCell>
                    <TableCell>{error.title}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}
