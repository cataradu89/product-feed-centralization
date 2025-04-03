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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Alert
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Stop as StopIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { importHistoryService, feedService } from '@/lib/api';
import { toast } from 'react-hot-toast';

const statusColors = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'error'
};

export default function FeedImports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [importHistory, setImportHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [feeds, setFeeds] = useState([]);
  const [feedFilter, setFeedFilter] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [globalStatus, setGlobalStatus] = useState({
    isImporting: false,
    currentImport: null,
    queuedImports: [],
    stats: {
      totalProcessed: 0,
      inserted: 0,
      updated: 0,
      deactivated: 0,
      errors: 0
    },
    totalActiveFeeds: 0,
    processedFeedsCount: 0
  });
  const [stoppingImport, setStoppingImport] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Funcție pentru formatarea duratei
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    
    if (seconds < 60) {
      return `${Math.round(seconds)} sec`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes} min ${remainingSeconds} sec`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} h ${minutes} min`;
    }
  };

  // Funcție pentru formatarea datei
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Încarcă toate feed-urile pentru filtru
  const fetchFeeds = async () => {
    try {
      const feedsData = await feedService.getFeeds();
      setFeeds(feedsData);
    } catch (error) {
      console.error('Error fetching feeds:', error);
      toast.error('Failed to fetch feeds');
    }
  };

  // Încarcă istoricul importurilor
  const fetchImportHistory = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter || undefined,
        feedId: feedFilter || undefined
      };
      
      const response = await importHistoryService.getImportHistory(params);
      
      // Actualizăm lista fără a cauza tremurături
      if (JSON.stringify(response.data) !== JSON.stringify(importHistory)) {
        setImportHistory(response.data);
      }
      
      setTotalPages(response.totalPages);
      if (!silent) setLoading(false);
    } catch (error) {
      console.error('Error fetching import history:', error);
      if (!silent) {
        toast.error('Failed to load import history');
        setLoading(false);
      }
    }
  };

  // Încarcă statusul global al importurilor
  const fetchGlobalStatus = async (silent = false) => {
    try {
      const status = await importHistoryService.getImportStatus();
      
      // Verificăm dacă datele s-au schimbat pentru a evita re-render-ul inutil
      if (JSON.stringify(status) !== JSON.stringify(globalStatus)) {
        setGlobalStatus(status);
      }
      
      return status;
    } catch (error) {
      console.error('Error fetching global import status:', error);
      return null;
    }
  };
  
  // Funcție pentru actualizarea periodică a datelor fără a cauza tremurături
  const setupPeriodicRefresh = () => {
    // Oprim orice refresh interval existent
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    
    // Creăm un nou interval de refresh
    const interval = setInterval(async () => {
      // Verificăm statusul global
      const status = await fetchGlobalStatus(true);
      
      // Actualizăm istoricul doar dacă există un import în curs
      if (status && status.isImporting) {
        // Transmitem filtrele actuale pentru a preveni deselectarea lor
        await fetchImportHistory(true);
      } else {
        // Dacă nu mai există importuri active, oprim refresh-ul automat
        clearInterval(refreshInterval);
        setRefreshInterval(null);
        
        // Actualizăm încă o dată pentru a vedea rezultatele finale
        await fetchImportHistory(true);
      }
      
      // Actualizăm timestamp-ul ultimului refresh
      setLastRefresh(Date.now());
    }, 3000);  // Refresh la fiecare 3 secunde
    
    setRefreshInterval(interval);
    return interval;
  };

  // Inițializează componenta
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      await fetchFeeds();
      await fetchImportHistory();
      
      if (isMounted) {
        // Inițial verificăm statusul și configurăm refresh-ul dacă este necesar
        const status = await fetchGlobalStatus();
        if (status && status.isImporting && isMounted) {
          setupPeriodicRefresh();
        }
      }
    };
    
    initialize();
    
    // Curățare la dezmontarea componentei
    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);
  
  // Actualizăm datele când se schimbă filtrele sau paginarea
  useEffect(() => {
    // Salvăm filtrele actuale în state sau localStorage pentru a le păstra între refresh-uri
    const saveCurrentFilters = () => {
      const filters = {
        page,
        limit,
        statusFilter,
        feedFilter
      };
      localStorage.setItem('importHistoryFilters', JSON.stringify(filters));
    };
    
    saveCurrentFilters();
    
    // Nu reactualizăm dacă ultimul refresh a fost foarte recent (pentru a evita tremuratul)
    if (Date.now() - lastRefresh > 500) {
      fetchImportHistory();
    }
  }, [page, limit, statusFilter, feedFilter]);

  // Încărcăm filtrele salvate anterior
  useEffect(() => {
    const loadSavedFilters = () => {
      const savedFilters = localStorage.getItem('importHistoryFilters');
      if (savedFilters) {
        try {
          const filters = JSON.parse(savedFilters);
          if (filters.statusFilter !== undefined) setStatusFilter(filters.statusFilter);
          if (filters.feedFilter !== undefined) setFeedFilter(filters.feedFilter);
          if (filters.page !== undefined) setPage(filters.page);
          if (filters.limit !== undefined) setLimit(filters.limit);
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }
    };
    
    loadSavedFilters();
  }, []);

  // Gestionează schimbarea paginii
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Gestionează schimbarea filtrului de status
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1); // Resetează paginarea
  };

  // Gestionează schimbarea filtrului de feed
  const handleFeedFilterChange = (event) => {
    setFeedFilter(event.target.value);
    setPage(1); // Resetează paginarea
  };

  // Gestionează refresh manual
  const handleRefresh = async () => {
    // Setăm un timeout pentru a nu cauza prea multe refresh-uri consecutive
    if (Date.now() - lastRefresh < 1000) {
      return; // Evităm refresh-urile prea rapide
    }
    
    // Actualizăm timestamp-ul
    setLastRefresh(Date.now());
    
    // Afișăm un indicator de loading fără a face întreaga pagină să tremure
    const statusElement = document.getElementById('status-card');
    if (statusElement) {
      statusElement.style.opacity = '0.7';
    }
    
    // Actualizăm datele
    await fetchGlobalStatus();
    await fetchImportHistory();
    
    // Verificăm dacă trebuie să configurăm refresh-ul automat
    if (globalStatus.isImporting && !refreshInterval) {
      setupPeriodicRefresh();
    }
    
    // Resetăm opacitatea
    if (statusElement) {
      statusElement.style.opacity = '1';
    }
  };

  // Navigare către detaliile importului
  const viewImportDetails = (importId) => {
    router.push(`/dashboard/feed-imports/${importId}`);
  };

  // Importă toate feed-urile active
  const handleImportAllFeeds = async () => {
    try {
      await feedService.importAllFeeds();
      toast.success('All active feeds queued for import');
      
      // Actualizăm datele și configurăm refresh-ul automat
      await fetchGlobalStatus();
      await fetchImportHistory();
      
      if (!refreshInterval) {
        setupPeriodicRefresh();
      }
    } catch (error) {
      console.error('Error starting import:', error);
      toast.error('Failed to start import');
    }
  };

  // Oprește toate importurile active
  const handleStopImport = async () => {
    try {
      setStoppingImport(true);
      
      // Oprim importurile din backend
      await importHistoryService.stopAllImports();
      
      // De asemenea, oprim importurile direct prin API-ul de feed
      await feedService.stopImport();
      
      toast.success('Import process stopped');
      
      // Actualizăm datele
      await fetchGlobalStatus();
      await fetchImportHistory();
      
      // Oprim refresh-ul automat
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      
      setStoppingImport(false);
    } catch (error) {
      console.error('Error stopping import:', error);
      toast.error('Failed to stop import process');
      setStoppingImport(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Feed Import History
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Track and monitor the progress and results of feed imports.
        </Typography>
      </Box>

      {/* Statusul global al importurilor */}
      <Card sx={{ mb: 4 }} id="status-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Global Import Status
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Today's Import Statistics
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Chip 
                    label={`${globalStatus.processedFeedsCount} / ${globalStatus.totalActiveFeeds} Feeds Processed`} 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip label={`${globalStatus.stats.totalProcessed} Products Processed`} color="primary" variant="outlined" />
                  <Chip label={`${globalStatus.stats.inserted} New Products`} color="success" />
                  <Chip label={`${globalStatus.stats.updated} Updated`} color="info" />
                  <Chip label={`${globalStatus.stats.deactivated} Deactivated`} color="warning" />
                  <Chip label={`${globalStatus.stats.errors} Errors`} color="error" />
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                {globalStatus.isImporting ? (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={handleStopImport}
                    disabled={stoppingImport}
                    sx={{ mr: 1 }}
                  >
                    {stoppingImport ? 'Stopping...' : 'Stop Import'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleImportAllFeeds}
                    sx={{ mr: 1 }}
                  >
                    Import All Feeds
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={Date.now() - lastRefresh < 1000}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {globalStatus.isImporting && globalStatus.currentImport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Import: {globalStatus.currentImport.feedName}
                {globalStatus.queuedImports.length > 0 && (
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    ({globalStatus.queuedImports.length} feeds queued)
                  </Typography>
                )}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <LinearProgress 
                  sx={{ flexGrow: 1, mr: 2, height: 10, borderRadius: 5 }} 
                  variant={globalStatus.currentImport.totalProcessed > 0 ? "determinate" : "indeterminate"}
                  value={globalStatus.currentImport.totalProcessed > 0 ? 100 * (globalStatus.currentImport.totalProcessed / (globalStatus.currentImport.totalProcessed + 100)) : 0}
                />
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {globalStatus.currentImport.totalProcessed || 0} processed
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Paper sx={{ p: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status Filter"
                  onChange={handleStatusFilterChange}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Feed Filter</InputLabel>
                <Select
                  value={feedFilter}
                  label="Feed Filter"
                  onChange={handleFeedFilterChange}
                >
                  <MenuItem value="">All Feeds</MenuItem>
                  {feeds.map((feed) => (
                    <MenuItem key={feed._id} value={feed._id}>
                      {feed.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Feed Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Products</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No import history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    importHistory.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.feedName}</TableCell>
                        <TableCell>
                          <Chip 
                            label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            color={statusColors[item.status]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(item.startTime)}</TableCell>
                        <TableCell>{formatDuration(item.duration)}</TableCell>
                        <TableCell>
                          {item.status === 'completed' ? (
                            <Typography variant="body2">
                              Processed: {item.totalProcessed}<br />
                              Added: {item.inserted} | Updated: {item.updated}<br />
                              Deactivated: {item.deactivated} | Errors: {item.errors}
                            </Typography>
                          ) : item.status === 'processing' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CircularProgress size={16} sx={{ mr: 1 }} />
                              <Typography variant="body2">
                                Processing: {item.totalProcessed || 0} products
                              </Typography>
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => viewImportDetails(item._id)}
                            title="View Details"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}
