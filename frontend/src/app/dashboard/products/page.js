'use client';

import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardMedia,
  CardContent,
  Divider,
  Link,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VisibilityOff as InactiveIcon,
  Visibility as ActiveIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { feedService, productService } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    feedId: '',
    category: '',
    brand: '',
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Fetch products on component mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch feeds first
        const feedsData = await feedService.getFeeds();
        setFeeds(feedsData);
        
        await fetchProducts();
        
        // Get product statistics for categories and brands
        const stats = await productService.getProductStats();
        setCategories(stats.categoryCounts.map(c => c._id));
        setBrands(stats.brandCounts.map(b => b._id));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = {
        page,
        limit,
        ...filters,
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key];
        }
      });
      
      const data = await productService.getProducts(params);
      setProducts(data.products);
      setTotalProducts(data.pagination.total);
      setPage(data.pagination.page);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, filters]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Reset to first page when filter changes
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      feedId: '',
      category: '',
      brand: '',
    });
    setPage(1);
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
  };

  const handleUpdateProductStatus = async (productId, status) => {
    try {
      await productService.updateProduct(productId, { product_active: status });
      toast.success('Product status updated');
      fetchProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update product status');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(productId);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  // Function to find feed name by id
  const getFeedName = (feedId) => {
    const feed = feeds.find(f => f._id === feedId);
    return feed ? feed.name : 'Unknown Feed';
  };

  if (loading && products.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Products Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchProducts()}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <form onSubmit={handleSearchSubmit} style={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Search Products"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" edge="end">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by title or description"
              />
            </form>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="feed-filter-label">Feed</InputLabel>
              <Select
                labelId="feed-filter-label"
                id="feed-filter"
                name="feedId"
                value={filters.feedId}
                label="Feed"
                onChange={handleFilterChange}
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
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                id="category-filter"
                name="category"
                value={filters.category}
                label="Category"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category, index) => (
                  <MenuItem key={index} value={category}>
                    {category || 'Uncategorized'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel id="brand-filter-label">Brand</InputLabel>
              <Select
                labelId="brand-filter-label"
                id="brand-filter"
                name="brand"
                value={filters.brand}
                label="Brand"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Brands</MenuItem>
                {brands.map((brand, index) => (
                  <MenuItem key={index} value={brand}>
                    {brand || 'Unknown'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1} display="flex" alignItems="center">
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleResetFilters}
              fullWidth
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Products Grid */}
      <Box mb={3}>
        <Typography variant="subtitle1" mb={1}>
          Showing {products.length} of {totalProducts} products
        </Typography>
        
        <Grid container spacing={3}>
          {products.length > 0 ? (
            products.map((product) => (
              <Grid item key={product._id} xs={12} sm={6} md={4} lg={3}>
                <Paper
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                >
                  {/* Status indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bgcolor: product.product_active === 1 ? 'success.main' : 'error.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      zIndex: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    {product.product_active === 1 ? 'Active' : 'Inactive'}
                  </Box>
                  
                  {/* Product image */}
                  <Box
                    sx={{
                      height: 200,
                      bgcolor: 'background.paper',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={product.image_urls || '/placeholder.png'}
                      alt={product.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.png';
                      }}
                    />
                  </Box>
                  
                  {/* Product info */}
                  <Box p={2} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" noWrap title={product.title}>
                      {product.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Brand: {product.brand || 'Unknown'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                      <Typography variant="h6" component="span" fontWeight="bold">
                        ${Number(product.price).toFixed(2)}
                      </Typography>
                      {product.old_price && (
                        <Typography
                          variant="body2"
                          component="span"
                          color="text.secondary"
                          sx={{ ml: 1, textDecoration: 'line-through' }}
                        >
                          ${Number(product.old_price).toFixed(2)}
                        </Typography>
                      )}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Feed: {getFeedName(product.feedId)}
                    </Typography>
                    
                    <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Tooltip title="View Details">
                        <IconButton color="primary" onClick={() => handleViewDetails(product)}>
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title={product.product_active === 1 ? "Mark as Inactive" : "Mark as Active"}>
                        <IconButton
                          color={product.product_active === 1 ? "success" : "error"}
                          onClick={() => handleUpdateProductStatus(product._id, product.product_active === 1 ? 0 : 1)}
                        >
                          {product.product_active === 1 ? <ActiveIcon /> : <InactiveIcon />}
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete Product">
                        <IconButton color="error" onClick={() => handleDeleteProduct(product._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No products found matching your filters.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Pagination */}
      {totalProducts > 0 && (
        <Box display="flex" justifyContent="center" my={3}>
          <Pagination
            count={Math.ceil(totalProducts / limit)}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Product Details Dialog */}
      <Dialog open={openDetails} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        {selectedProduct && (
          <>
            <DialogTitle>
              Product Details
              <IconButton
                aria-label="close"
                onClick={handleCloseDetails}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                &times;
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                  <Box
                    sx={{
                      height: 300,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #eee',
                      borderRadius: 1,
                    }}
                  >
                    <img
                      src={selectedProduct.image_urls || '/placeholder.png'}
                      alt={selectedProduct.title}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.png';
                      }}
                    />
                  </Box>
                  
                  <Box mt={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      component="a"
                      href={selectedProduct.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Product
                    </Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={7}>
                  <Typography variant="h5" gutterBottom>
                    {selectedProduct.title}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" mb={1}>
                    <Chip
                      label={selectedProduct.product_active === 1 ? 'Active' : 'Inactive'}
                      color={selectedProduct.product_active === 1 ? 'success' : 'error'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Product ID: {selectedProduct.product_id}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" color="primary" gutterBottom>
                    ${Number(selectedProduct.price).toFixed(2)}
                    {selectedProduct.old_price && (
                      <Typography
                        variant="body1"
                        component="span"
                        color="text.secondary"
                        sx={{ ml: 1, textDecoration: 'line-through' }}
                      >
                        ${Number(selectedProduct.old_price).toFixed(2)}
                      </Typography>
                    )}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Brand:
                      </Typography>
                      <Typography variant="body1">
                        {selectedProduct.brand || 'Unknown'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Category:
                      </Typography>
                      <Typography variant="body1">
                        {selectedProduct.category || 'Uncategorized'}
                      </Typography>
                    </Grid>
                    
                    {selectedProduct.subcategory && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Subcategory:
                        </Typography>
                        <Typography variant="body1">
                          {selectedProduct.subcategory}
                        </Typography>
                      </Grid>
                    )}
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Feed:
                      </Typography>
                      <Typography variant="body1">
                        {getFeedName(selectedProduct.feedId)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Campaign:
                      </Typography>
                      <Typography variant="body1">
                        {selectedProduct.campaign_name}
                      </Typography>
                    </Grid>
                    
                    {selectedProduct.description && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Description:
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {selectedProduct.description}
                        </Typography>
                      </Grid>
                    )}
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Affiliate Link:
                      </Typography>
                      <TextField
                        fullWidth
                        value={selectedProduct.aff_code}
                        InputProps={{
                          readOnly: true,
                        }}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
              <Button
                variant="contained"
                color={selectedProduct.product_active === 1 ? "error" : "success"}
                onClick={() => {
                  handleUpdateProductStatus(selectedProduct._id, selectedProduct.product_active === 1 ? 0 : 1);
                  handleCloseDetails();
                }}
              >
                {selectedProduct.product_active === 1 ? "Mark as Inactive" : "Mark as Active"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
