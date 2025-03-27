'use client';

import { useState, useEffect } from 'react';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDownload as ImportIcon,
  CloudUpload as BulkImportIcon,
  Close as CloseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  LinearProgress,
  Badge,
  Drawer,
  Alert
} from '@mui/material';
import { feedService } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import BulkImportFeeds from '../components/BulkImportFeeds';

export default function FeedsPage() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentFeed, setCurrentFeed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    status: 1,
  });
  const [importStatus, setImportStatus] = useState({
    isImporting: false,
    currentFeed: null,
    progress: 0,
    message: '',
    inBackground: false,
    currentIndex: 0,
    totalFeeds: 0,
    errors: [],
    success: [],
  });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [openBulkImportDialog, setOpenBulkImportDialog] = useState(false);
  const [openImportDrawer, setOpenImportDrawer] = useState(false);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [shouldStopImport, setShouldStopImport] = useState(false);

  // Fetch feeds on component mount
  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const data = await feedService.getFeeds();
      setFeeds(data);
    } catch (error) {
      console.error('Error fetching feeds:', error);
      showSnackbar('Failed to load feeds', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (feed = null) => {
    if (feed) {
      setCurrentFeed(feed);
      setFormData({
        name: feed.name,
        url: feed.url,
        status: feed.status,
      });
    } else {
      setCurrentFeed(null);
      setFormData({
        name: '',
        url: '',
        status: 1,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (currentFeed) {
        // Update existing feed
        await feedService.updateFeed(currentFeed._id, formData);
        showSnackbar('Feed updated successfully', 'success');
      } else {
        // Create new feed
        await feedService.createFeed(formData);
        showSnackbar('Feed created successfully', 'success');
      }
      handleCloseDialog();
      fetchFeeds();
    } catch (error) {
      console.error('Error saving feed:', error);
      showSnackbar('Failed to save feed', 'error');
    }
  };

  const handleDelete = async (feedId) => {
    if (window.confirm('Are you sure you want to delete this feed?')) {
      try {
        await feedService.deleteFeed(feedId);
        showSnackbar('Feed deleted successfully', 'success');
        fetchFeeds();
      } catch (error) {
        console.error('Error deleting feed:', error);
        showSnackbar('Failed to delete feed', 'error');
      }
    }
  };

  // Function to import a single feed
  const importSingleFeed = async (feed) => {
    if (feed.status === 0) {
      showSnackbar('Cannot import inactive feed', 'warning');
      return;
    }

    try {
      // Set initial import status
      setImportStatus({
        isImporting: true,
        currentFeed: feed,
        progress: 0,
        message: `Importing feed: ${feed.name}`,
        inBackground: false,
        currentIndex: 0,
        totalFeeds: 1,
        errors: [],
        success: [],
      });

      // Import the feed
      const result = await feedService.importFeed(feed._id);
      
      // Update import status on success
      setImportStatus(prev => ({
        ...prev,
        progress: 100,
        message: `Successfully imported ${result.totalProcessed} products (${result.inserted} new, ${result.updated} updated)`,
        success: [...prev.success, feed.name],
      }));

      showSnackbar(`Feed "${feed.name}" imported successfully`, 'success');
      
      // Short delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset import status
      setImportStatus({
        isImporting: false,
        currentFeed: null,
        progress: 0,
        message: '',
        inBackground: false,
        currentIndex: 0,
        totalFeeds: 0,
        errors: [],
        success: [],
      });
      
      fetchFeeds(); // Refresh feeds list to update lastImported timestamp
    } catch (error) {
      console.error(`Error importing feed ${feed.name}:`, error);
      setImportStatus(prev => ({
        ...prev,
        isImporting: false,
        currentFeed: null,
        progress: 0,
        message: '',
        errors: [...prev.errors, feed.name],
      }));
      showSnackbar(`Failed to import feed: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const stopImport = () => {
    setShouldStopImport(true);
    setImportStatus(prev => ({
      ...prev,
      isImporting: false,
      message: "Import process stopped by user",
      progress: 0,
    }));
    showSnackbar('Import process stopped', 'info');
  };

  const toggleImportDrawer = () => {
    setOpenImportDrawer(prev => !prev);
  };

  const importFeeds = async () => {
    // Get only active feeds
    const activeFeeds = feeds.filter((feed) => feed.status === 1);
    
    if (activeFeeds.length === 0) {
      showSnackbar('No active feeds to import', 'warning');
      return;
    }

    // Reset stop flag at the beginning of the import
    setShouldStopImport(false);

    try {
      // Initial setup for import process
      setImportStatus({
        isImporting: true,
        currentFeed: null,
        progress: 0,
        message: 'Starting import process...',
        inBackground: true,
        currentIndex: 0,
        totalFeeds: activeFeeds.length,
        errors: [],
        success: [],
      });

      // Open import drawer to show progress
      setOpenImportDrawer(true);

      // Create a copy for sorting to avoid modifying the original array
      const feedsToImport = [...activeFeeds];
      
      // Debug log to show initial feed order
      console.log('Initial feed order:', feedsToImport.map(f => ({
        name: f.name,
        lastImported: f.lastImported ? new Date(f.lastImported).toLocaleString() : 'Never'
      })));

      // Sort feeds by lastImported date (null values first, then older to newer)
      const sortedFeeds = feedsToImport.sort((a, b) => {
        // If a has never been imported, it comes first
        if (!a.lastImported && b.lastImported) return -1;
        
        // If b has never been imported, it comes first
        if (!b.lastImported && a.lastImported) return 1;
        
        // If both have never been imported, sort by name
        if (!a.lastImported && !b.lastImported) {
          return a.name.localeCompare(b.name);
        }
        
        // Otherwise, sort by date (older dates first)
        return new Date(a.lastImported) - new Date(b.lastImported);
      });

      // Debug log to show sorted feed order
      console.log('Sorted feed order:', sortedFeeds.map(f => ({
        name: f.name,
        lastImported: f.lastImported ? new Date(f.lastImported).toLocaleString() : 'Never',
        importDate: f.lastImported ? new Date(f.lastImported) : null
      })));

      setImportStatus(prev => ({
        ...prev,
        message: `Ready to import ${sortedFeeds.length} feeds, prioritizing never imported and oldest feeds first`,
      }));

      // Process feeds one by one
      for (let i = 0; i < sortedFeeds.length; i++) {
        // Check if import should be stopped
        if (shouldStopImport) {
          console.log('Import process stopped by user');
          break;
        }
        
        const feed = sortedFeeds[i];
        const progress = Math.round((i / sortedFeeds.length) * 100);
        const importStatusText = !feed.lastImported 
          ? 'never imported before' 
          : `last imported: ${formatDate(feed.lastImported)}`;
        
        // Update progress state
        setImportStatus(prev => ({
          ...prev,
          currentFeed: feed,
          progress,
          currentIndex: i,
          message: `Importing feed ${i+1}/${sortedFeeds.length}: ${feed.name} (${importStatusText})`,
        }));

        try {
          // Import the feed
          const result = await feedService.importFeed(feed._id);
          
          // Update success state
          setImportStatus(prev => ({
            ...prev,
            progress,
            message: `Imported ${result.totalProcessed} products from ${feed.name} (${result.inserted} new, ${result.updated} updated)`,
            success: [...prev.success, feed.name],
          }));
        } catch (error) {
          console.error(`Error importing feed ${feed.name}:`, error);
          
          // Update error state
          setImportStatus(prev => ({
            ...prev,
            progress,
            message: `Error importing feed: ${feed.name}. ${error.response?.data?.message || error.message}`,
            errors: [...prev.errors, feed.name],
          }));
        }

        // Short delay between feeds to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Final status update
      setImportStatus(prev => {
        const completedCount = prev.success.length;
        const failedCount = prev.errors.length;
        return {
          ...prev,
          isImporting: false,
          currentFeed: null,
          progress: 100,
          message: `Import completed! Successfully imported ${completedCount} feeds, failed to import ${failedCount} feeds.`,
        };
      });
      
      showSnackbar(`Import process completed. Success: ${importStatus.success.length}, Failed: ${importStatus.errors.length}`, 'success');
      fetchFeeds(); // Refresh feeds list to update lastImported timestamp
    } catch (error) {
      console.error('Error during import process:', error);
      setImportStatus(prev => ({
        ...prev,
        isImporting: false,
        progress: 0,
        message: `Import process failed: ${error.message}`,
      }));
      showSnackbar('Import process failed', 'error');
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const descendingComparator = (a, b, orderBy) => {
    // Special case for lastImported
    if (orderBy === 'lastImported') {
      // If both are null or undefined, maintain original order
      if (!a[orderBy] && !b[orderBy]) return 0;
      // Null values should be at the end in descending order
      if (!a[orderBy]) return 1;
      if (!b[orderBy]) return -1;
      // Compare dates
      return new Date(b[orderBy]) - new Date(a[orderBy]);
    }
    
    // Special case for importCount (numeric comparison)
    if (orderBy === 'importCount') {
      return b[orderBy] - a[orderBy];
    }
    
    // Handle status (active/inactive comparison)
    if (orderBy === 'status') {
      return b[orderBy] - a[orderBy];
    }
    
    // Default string comparison
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const BadgeNotification = () => {
    // Only show if importing and in background mode
    if (!importStatus.isImporting || !importStatus.inBackground) return null;
    
    const totalImports = importStatus.totalFeeds;
    const completedImports = importStatus.success.length + importStatus.errors.length;
    
    return (
      <Tooltip title="View Import Progress">
        <IconButton 
          color="primary" 
          onClick={toggleImportDrawer}
          sx={{ position: 'fixed', bottom: 20, right: 20, backgroundColor: 'white', boxShadow: 3, zIndex: 1000 }}
        >
          <Badge 
            badgeContent={completedImports + '/' + totalImports} 
            color="secondary"
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
    );
  };

  if (loading && feeds.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Import status floating button */}
      <BadgeNotification />
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Feeds Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchFeeds}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ImportIcon />}
            onClick={importFeeds}
            disabled={importStatus.isImporting}
            sx={{ mr: 1 }}
          >
            Import All
          </Button>
          <Button
            variant="outlined"
            startIcon={<BulkImportIcon />}
            onClick={() => setOpenBulkImportDialog(true)}
            sx={{ mr: 2 }}
          >
            Bulk Import
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Feed
          </Button>
        </Box>
      </Box>

      {/* Import Status */}
      {importStatus.isImporting && !importStatus.inBackground && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Import Progress
          </Typography>
          <Box display="flex" alignItems="center" mb={1}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography>
              {importStatus.message}
            </Typography>
          </Box>
          {importStatus.currentFeed && (
            <Typography variant="body2" color="text.secondary">
              Processing feed: {importStatus.currentFeed.name} 
              ({importStatus.progress}% complete)
            </Typography>
          )}
          <LinearProgress variant="determinate" value={importStatus.progress} sx={{ mt: 1, mb: 2 }} />
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopImport}
            sx={{ mt: 1 }}
          >
            Stop Import
          </Button>
        </Paper>
      )}

      {/* Feeds Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>URL</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'lastImported'}
                  direction={orderBy === 'lastImported' ? order : 'asc'}
                  onClick={() => handleRequestSort('lastImported')}
                >
                  Last Imported
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'importCount'}
                  direction={orderBy === 'importCount' ? order : 'asc'}
                  onClick={() => handleRequestSort('importCount')}
                >
                  Import Count
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feeds.length > 0 ? (
              feeds.sort(getComparator(order, orderBy)).map((feed) => (
                <TableRow key={feed._id}>
                  <TableCell>{feed.name}</TableCell>
                  <TableCell>
                    <Tooltip title={feed.url}>
                      <Typography
                        sx={{
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {feed.url}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {feed.status === 1 ? (
                      <Typography color="success.main">Active</Typography>
                    ) : (
                      <Typography color="error.main">Inactive</Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(feed.lastImported)}</TableCell>
                  <TableCell>{feed.importCount}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Import Feed">
                      <IconButton
                        color="primary"
                        onClick={() => importSingleFeed(feed)}
                        disabled={importStatus.isImporting}
                      >
                        <ImportIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Feed">
                      <IconButton
                        color="secondary"
                        onClick={() => handleOpenDialog(feed)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Feed">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(feed._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography py={2} color="text.secondary">
                    No feeds available. Add your first feed to start importing products.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Feed Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentFeed ? 'Edit Feed' : 'Add New Feed'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Feed Name"
            type="text"
            fullWidth
            value={formData.name}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="url"
            label="Feed URL"
            type="url"
            fullWidth
            value={formData.url}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            helperText="Enter the URL of the CSV feed"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              id="status"
              name="status"
              value={formData.status}
              label="Status"
              onChange={handleChange}
            >
              <MenuItem value={1}>Active</MenuItem>
              <MenuItem value={0}>Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog 
        open={openBulkImportDialog} 
        onClose={() => setOpenBulkImportDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Bulk Import Feeds
          <IconButton
            aria-label="close"
            onClick={() => setOpenBulkImportDialog(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 4, pt: 2 }}>
          {openBulkImportDialog && (
            <BulkImportFeeds 
              onImportComplete={() => {
                fetchFeeds();
                setOpenBulkImportDialog(false);
                setSnackbarMessage('Feeds imported successfully');
                setSnackbarSeverity('success');
                setOpenSnackbar(true);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Import Drawer */}
      <Drawer
        anchor="right"
        open={openImportDrawer}
        onClose={() => setOpenImportDrawer(false)}
      >
        <Box sx={{ width: 350, p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom>
              Import Status
            </Typography>
            <IconButton onClick={() => setOpenImportDrawer(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {importStatus.isImporting ? "Import In Progress..." : "Import Complete"}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={importStatus.progress} 
              sx={{ mt: 1, mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              {importStatus.message}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Summary
            </Typography>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">
                Total feeds:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {importStatus.totalFeeds}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="success.main">
                Successfully imported:
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="success.main">
                {importStatus.success.length}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="error.main">
                Failed:
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="error.main">
                {importStatus.errors.length}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2">
                Remaining:
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {importStatus.totalFeeds - (importStatus.success.length + importStatus.errors.length)}
              </Typography>
            </Box>
          </Box>
          
          {importStatus.currentFeed && importStatus.isImporting && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Currently Processing
              </Typography>
              <Paper sx={{ p: 1, bgcolor: 'background.paper' }}>
                <Typography variant="body2">
                  Feed: <strong>{importStatus.currentFeed.name}</strong>
                </Typography>
                <Typography variant="body2" fontSize="0.8rem" color="text.secondary">
                  {importStatus.currentFeed.url}
                </Typography>
              </Paper>
            </Box>
          )}
          
          {importStatus.isImporting ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={stopImport}
              fullWidth
            >
              Stop Import
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenImportDrawer(false)}
              fullWidth
            >
              Close
            </Button>
          )}
        </Box>
      </Drawer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
