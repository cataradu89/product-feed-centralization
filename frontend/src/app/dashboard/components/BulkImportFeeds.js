'use client';

import { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  LinearProgress
} from '@mui/material';
import { 
  Upload as UploadIcon,
  Close as CloseIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import { feedService } from '../../../lib/api';
import { toast } from 'react-hot-toast';

const sampleCsv = 'name,url\nGoogle,https://google.com\nAmazon,https://amazon.com';

const BulkImportFeeds = ({ onImportComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setError('');
    setImportResults(null);
    
    // Check file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setSelectedFile(file);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Validate headers
        if (!headers.includes('name') || !headers.includes('url')) {
          setError('CSV must contain columns for "name" and "url"');
          return;
        }
        
        const nameIndex = headers.indexOf('name');
        const urlIndex = headers.indexOf('url');
        const statusIndex = headers.indexOf('status');
        
        const parsedFeeds = [];
        
        // Start from 1 to skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines
          
          const values = line.split(',');
          if (values.length < 2) continue; // Skip invalid lines
          
          const feed = {
            name: values[nameIndex]?.trim(),
            url: values[urlIndex]?.trim()
          };
          
          // Add status if available
          if (statusIndex !== -1 && values[statusIndex] !== undefined) {
            feed.status = parseInt(values[statusIndex]) || 1;
          }
          
          if (feed.name && feed.url) {
            parsedFeeds.push(feed);
          }
        }
        
        if (parsedFeeds.length === 0) {
          setError('No valid feeds found in the CSV');
          return;
        }
        
        setParsedData(parsedFeeds);
        setShowPreview(true);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setError('Error parsing CSV file. Please check the format.');
      }
    };
    
    reader.onerror = () => {
      setError('Error reading the file');
    };
    
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
      setError('No valid data to import');
      return;
    }
    
    try {
      setIsProcessing(true);
      const results = await feedService.bulkImportFeeds(parsedData);
      setImportResults(results);
      toast.success(`Successfully imported ${results.imported} feeds`);
      
      if (typeof onImportComplete === 'function') {
        onImportComplete();
      }
    } catch (error) {
      console.error('Error importing feeds:', error);
      toast.error('Failed to import feeds');
      setError(error.response?.data?.message || 'Error importing feeds');
    } finally {
      setIsProcessing(false);
      setShowPreview(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setParsedData(null);
    setSelectedFile(null);
  };

  const handleDownloadSample = () => {
    const element = document.createElement('a');
    const file = new Blob([sampleCsv], {type: 'text/csv'});
    element.href = URL.createObjectURL(file);
    element.download = 'sample_feeds.csv';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderUploadArea = () => (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        border: '2px dashed',
        borderColor: isDragging ? 'primary.main' : 'grey.300',
        bgcolor: isDragging ? 'primary.50' : 'background.paper',
        transition: 'all 0.3s',
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'primary.50',
        },
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Drop a CSV file here or click to upload
      </Typography>
      <Typography variant="body2" color="text.secondary">
        CSV file must contain columns for "name" and "url"
      </Typography>
      <Button 
        startIcon={<DownloadIcon />} 
        onClick={(e) => {
          e.stopPropagation();
          handleDownloadSample();
        }}
        sx={{ mt: 2 }}
      >
        Download Sample CSV
      </Button>
    </Paper>
  );

  const renderPreview = () => (
    <Dialog
      open={showPreview && parsedData && parsedData.length > 0}
      onClose={handleCancelPreview}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Preview Feeds Import
        <IconButton
          aria-label="close"
          onClick={handleCancelPreview}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          File: {selectedFile?.name}
        </Typography>
        <Typography variant="body2" gutterBottom>
          {parsedData ? parsedData.length : 0} feeds found in the CSV file.
        </Typography>
        
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 300 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parsedData && parsedData.slice(0, 100).map((feed, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{feed.name}</TableCell>
                  <TableCell>{feed.url}</TableCell>
                  <TableCell>{feed.status === 0 ? 'Inactive' : 'Active'}</TableCell>
                </TableRow>
              ))}
              {parsedData && parsedData.length > 100 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    +{parsedData.length - 100} more feeds...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelPreview} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleImport} 
          color="primary" 
          variant="contained"
          disabled={isProcessing}
        >
          {isProcessing ? 'Importing...' : 'Import Feeds'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderResults = () => {
    if (!importResults) return null;
    
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Import Results
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Total Feeds: {importResults.total}
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <LinearProgress 
                variant="determinate" 
                value={(importResults.imported / importResults.total) * 100} 
                color="success"
                sx={{ height: 10, borderRadius: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="success.main">
                Successfully Imported: {importResults.imported}
              </Typography>
            </Grid>
            <Grid item xs={6} textAlign="right">
              <Typography variant="body2" color="error.main">
                Failed: {importResults.failed}
              </Typography>
            </Grid>
          </Grid>
        </Box>
        
        {importResults.errors && importResults.errors.length > 0 && (
          <>
            <Typography variant="subtitle2" color="error" gutterBottom>
              Errors:
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importResults.errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{error.name}</TableCell>
                      <TableCell>{error.url}</TableCell>
                      <TableCell>{error.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            onClick={() => setImportResults(null)}
          >
            Close
          </Button>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {isProcessing ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Importing feeds, please wait...
          </Typography>
        </Box>
      ) : (
        renderUploadArea()
      )}
      
      {renderPreview()}
      {renderResults()}
    </Box>
  );
};

export default BulkImportFeeds;
