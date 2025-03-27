'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import storeService from '@/services/storeService';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  TableSortLabel,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Image as ImageIcon,
  ImageSearch as ImageSearchIcon,
  Check as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';

export default function StoresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('productCount');
  const [totalStores, setTotalStores] = useState(0);
  const [isGeneratingFavicons, setIsGeneratingFavicons] = useState(false);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [generationResults, setGenerationResults] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const data = await storeService.getStores();
      setStores(data);
      setTotalStores(data.length);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
      setLoading(false);
    }
  };

  const refreshStores = async () => {
    try {
      setLoading(true);
      const data = await storeService.refreshStores();
      setStores(data);
      setTotalStores(data.length);
      setLoading(false);
      showSnackbar('Stores refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing stores:', error);
      showSnackbar('Failed to refresh stores', 'error');
      setLoading(false);
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const viewStoreProducts = (storeName) => {
    router.push(`/dashboard/products?store=${encodeURIComponent(storeName)}`);
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const handleGenerateFavicon = async (store) => {
    try {
      setIsGeneratingFavicons(true);
      const result = await storeService.generateFavicon(store._id);
      
      // Find the store in the array and update its favicon
      const updatedStores = stores.map(s => 
        s._id === store._id ? { ...s, favicon: result.store.favicon } : s
      );
      
      setStores(updatedStores);
      showSnackbar(`Favicon generated successfully for ${store.name}`, 'success');
    } catch (error) {
      console.error(`Error generating favicon for ${store.name}:`, error);
      showSnackbar(`Failed to generate favicon for ${store.name}`, 'error');
    } finally {
      setIsGeneratingFavicons(false);
    }
  };

  const handleGenerateAllFavicons = async () => {
    try {
      setIsGeneratingFavicons(true);
      setOpenGenerateDialog(true);
      
      const result = await storeService.generateAllFavicons();
      setGenerationResults(result);
      
      // Refresh the stores to get updated favicons
      await fetchStores();
      
      showSnackbar(`Generated ${result.successCount} favicons with ${result.errorCount} errors`, 
        result.errorCount === 0 ? 'success' : 'warning');
    } catch (error) {
      console.error('Error generating all favicons:', error);
      showSnackbar('Failed to generate favicons', 'error');
    } finally {
      setIsGeneratingFavicons(false);
    }
  };

  const closeGenerateDialog = () => {
    setOpenGenerateDialog(false);
    setGenerationResults(null);
  };

  // Sort function
  const sortedStores = () => {
    return [...stores].sort((a, b) => {
      const isAsc = order === 'asc';
      
      if (orderBy === 'name') {
        return isAsc 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (orderBy === 'productCount') {
        return isAsc 
          ? a.productCount - b.productCount 
          : b.productCount - a.productCount;
      }
      return 0;
    }).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };

  if (loading && stores.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Count stores with and without favicons
  const storesWithFavicon = stores.filter(store => store.favicon).length;
  const storesWithoutFavicon = stores.length - storesWithFavicon;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Stores Management
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ImageSearchIcon />}
            onClick={handleGenerateAllFavicons}
            disabled={isGeneratingFavicons || storesWithoutFavicon === 0}
            sx={{ mr: 1 }}
          >
            Generate All Favicons
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={refreshStores}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Stores
              </Typography>
              <Typography variant="h3">
                {totalStores}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                With Favicon
              </Typography>
              <Typography variant="h3" color="success.main">
                {storesWithFavicon}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Without Favicon
              </Typography>
              <Typography variant="h3" color="warning.main">
                {storesWithoutFavicon}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stores Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Store Name
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'productCount'}
                    direction={orderBy === 'productCount' ? order : 'desc'}
                    onClick={() => handleRequestSort('productCount')}
                  >
                    Product Count
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedStores().map((store) => (
                <TableRow key={store._id || store.name} hover>
                  <TableCell>
                    {store.favicon ? (
                      <Avatar 
                        src={store.faviconUrl || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${store.favicon}`}
                        sx={{ width: 24, height: 24 }}
                        alt={store.name}
                        imgProps={{ 
                          referrerPolicy: "no-referrer",
                          crossOrigin: "anonymous" 
                        }}
                      />
                    ) : (
                      <Avatar 
                        sx={{ width: 24, height: 24, bgcolor: 'grey.300' }}
                        alt={store.name}
                      >
                        <ImageIcon sx={{ width: 16, height: 16 }} />
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell>
                    {store.name || 'Unknown Store'}
                  </TableCell>
                  <TableCell align="right">
                    {store.productCount?.toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center">
                      <Tooltip title="Generate Favicon">
                        <span>
                          <IconButton 
                            onClick={() => handleGenerateFavicon(store)}
                            color="secondary"
                            disabled={isGeneratingFavicons || Boolean(store.favicon)}
                            sx={{ mr: 1 }}
                          >
                            <ImageSearchIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="View Products">
                        <IconButton 
                          onClick={() => viewStoreProducts(store.name)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {stores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No stores found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={stores.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Generate All Favicons Dialog */}
      <Dialog open={openGenerateDialog} onClose={closeGenerateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Generate Favicons
        </DialogTitle>
        <DialogContent>
          {isGeneratingFavicons ? (
            <Box display="flex" flexDirection="column" alignItems="center" my={3}>
              <CircularProgress />
              <Typography variant="body1" mt={2}>
                Generating favicons for all stores...
              </Typography>
            </Box>
          ) : generationResults ? (
            <Box my={2}>
              <Typography variant="h6" gutterBottom>
                Results
              </Typography>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckIcon color="success" sx={{ mr: 1 }} />
                <Typography>
                  Successfully generated: {generationResults.successCount}
                </Typography>
              </Box>
              {generationResults.errorCount > 0 && (
                <Box display="flex" alignItems="center" mb={2}>
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                  <Typography>
                    Failed: {generationResults.errorCount}
                  </Typography>
                </Box>
              )}
              {generationResults.errors?.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  {generationResults.errors.map((error, index) => (
                    <Chip 
                      key={index}
                      label={`${error.storeName}: ${error.error}`}
                      color="error"
                      variant="outlined"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGenerateDialog} color="primary" disabled={isGeneratingFavicons}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
