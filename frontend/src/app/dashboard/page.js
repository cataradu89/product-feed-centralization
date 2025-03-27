'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  RssFeed as FeedIcon, 
  Category as ProductIcon, 
  CheckCircle as ActiveIcon, 
  Cancel as InactiveIcon,
  TrendingUp as StatsIcon 
} from '@mui/icons-material';
import { feedService, productService } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    feedCount: 0,
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    categoryCounts: [],
    brandCounts: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch feeds
        const feeds = await feedService.getFeeds();
        
        // Fetch product statistics
        const productStats = await productService.getProductStats();
        
        setStats({
          feedCount: feeds.length,
          totalProducts: productStats.totalProducts,
          activeProducts: productStats.activeProducts,
          inactiveProducts: productStats.inactiveProducts,
          categoryCounts: productStats.categoryCounts,
          brandCounts: productStats.brandCounts
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box 
            sx={{ 
              bgcolor: `${color}.light`, 
              color: `${color}.main`,
              p: 1.5,
              borderRadius: 2
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
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
          Dashboard
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => router.push('/dashboard/feeds')}
        >
          Manage Feeds
        </Button>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard 
            title="Total Feeds" 
            value={stats.feedCount} 
            icon={<FeedIcon />} 
            color="primary" 
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard 
            title="Total Products" 
            value={stats.totalProducts} 
            icon={<ProductIcon />} 
            color="secondary" 
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard 
            title="Active Products" 
            value={stats.activeProducts} 
            icon={<ActiveIcon />} 
            color="success" 
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard 
            title="Inactive Products" 
            value={stats.inactiveProducts} 
            icon={<InactiveIcon />} 
            color="error" 
          />
        </Grid>
      </Grid>

      {/* Categories & Brands */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <StatsIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Top Categories</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {stats.categoryCounts.length > 0 ? (
              stats.categoryCounts.map((category, index) => (
                <Box 
                  key={index} 
                  display="flex" 
                  justifyContent="space-between" 
                  py={1}
                  borderBottom={index < stats.categoryCounts.length - 1 ? '1px solid #eee' : 'none'}
                >
                  <Typography>{category._id || 'Uncategorized'}</Typography>
                  <Typography fontWeight="bold">{category.count}</Typography>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">No categories available</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <StatsIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6">Top Brands</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {stats.brandCounts.length > 0 ? (
              stats.brandCounts.map((brand, index) => (
                <Box 
                  key={index} 
                  display="flex" 
                  justifyContent="space-between" 
                  py={1}
                  borderBottom={index < stats.brandCounts.length - 1 ? '1px solid #eee' : 'none'}
                >
                  <Typography>{brand._id || 'Unknown'}</Typography>
                  <Typography fontWeight="bold">{brand.count}</Typography>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">No brands available</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
