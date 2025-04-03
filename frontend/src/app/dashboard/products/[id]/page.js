'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from 'date-fns';
import Link from 'next/link';
import PriceHistoryDisplay from '@/components/PriceHistoryDisplay';

const ProductDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await api.getProductById(id);
          setProduct(data);
          setEditFormData({
            title: data.title,
            description: data.description || '',
            price: data.price,
            old_price: data.old_price || '',
            brand: data.brand || '',
            sku: data.sku || '',
            ean: data.ean || '',
            availability: data.availability || '',
            stock: data.stock === undefined ? '' : data.stock,
            category: data.category || '',
            store: data.store || '',
            url: data.url,
            image_url: data.image_url || '',
            product_active: data.product_active === 1,
          });
        } catch (err) {
          setError('Failed to fetch product details.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      const fetchPriceHistory = async () => {
        setIsHistoryLoading(true);
        try {
          const historyData = await api.getProductPriceHistory(id);
          setPriceHistory(historyData);
        } catch (err) {
          console.error('Failed to fetch price history:', err);
        } finally {
          setIsHistoryLoading(false);
        }
      };

      fetchProduct();
      fetchPriceHistory();
    }
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setIsLoading(true);
      try {
        await api.deleteProduct(id);
        router.push('/dashboard/products');
      } catch (err) {
        setError('Failed to delete product.');
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing && product) {
      setEditFormData({
        title: product.title,
        description: product.description || '',
        price: product.price,
        old_price: product.old_price || '',
        brand: product.brand || '',
        sku: product.sku || '',
        ean: product.ean || '',
        availability: product.availability || '',
        stock: product.stock === undefined ? '' : product.stock,
        category: product.category || '',
        store: product.store || '',
        url: product.url,
        image_url: product.image_url || '',
        product_active: product.product_active === 1,
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setEditFormData(prev => ({ ...prev, product_active: checked }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const updateData = {
        ...editFormData,
        price: parseFloat(editFormData.price) || 0,
        old_price: editFormData.old_price ? parseFloat(editFormData.old_price) : null,
        stock: editFormData.stock !== '' ? parseInt(editFormData.stock) : null,
        product_active: editFormData.product_active ? 1 : 0,
      };
      const updatedProduct = await api.updateProduct(id, updateData);
      setProduct(updatedProduct);
      setIsEditing(false);
      
      // Reîncarcă istoricul prețurilor pentru a afișa eventualele modificări
      const historyData = await api.getProductPriceHistory(id);
      setPriceHistory(historyData);
    } catch (err) {
      setError('Failed to update product.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !product) {
    return <div>Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Product not found.'}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {error && !isEditing && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{isEditing ? 'Edit Product' : product.title}</CardTitle>
              <CardDescription>Product ID: {product._id}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant={isEditing ? "secondary" : "default"} onClick={handleEditToggle}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              {isEditing && (
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
              {!isEditing && (
                <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          </div>
          {error && isEditing && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Save Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" value={editFormData.title || ''} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={editFormData.description || ''} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (RON)</Label>
                <Input id="price" name="price" type="number" step="0.01" value={editFormData.price || ''} onChange={handleInputChange} disabled={!isEditing} />
              </div>
              <div>
                <Label htmlFor="old_price">Old Price (RON)</Label>
                <Input id="old_price" name="old_price" type="number" step="0.01" value={editFormData.old_price || ''} onChange={handleInputChange} disabled={!isEditing} />
              </div>
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" name="brand" value={editFormData.brand || ''} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" value={editFormData.sku || ''} onChange={handleInputChange} disabled={!isEditing} />
              </div>
              <div>
                <Label htmlFor="ean">EAN</Label>
                <Input id="ean" name="ean" value={editFormData.ean || ''} onChange={handleInputChange} disabled={!isEditing} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="availability">Availability</Label>
                <Input id="availability" name="availability" value={editFormData.availability || ''} onChange={handleInputChange} disabled={!isEditing} />
              </div>
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" name="stock" type="number" value={editFormData.stock || ''} onChange={handleInputChange} disabled={!isEditing} />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" value={editFormData.category || ''} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div>
              <Label htmlFor="store">Store</Label>
              <Input id="store" name="store" value={editFormData.store || ''} onChange={handleInputChange} disabled={!isEditing} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Product URL</Label>
              <Input id="url" name="url" value={editFormData.url || ''} onChange={handleInputChange} disabled={!isEditing} />
              {!isEditing && product.url && (
                <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 block">Visit Product Page</a>
              )}
            </div>
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input id="image_url" name="image_url" value={editFormData.image_url || ''} onChange={handleInputChange} disabled={!isEditing} />
              {!isEditing && product.image_url && (
                <img src={product.image_url} alt={product.title} className="mt-2 max-h-40 rounded" />
              )}
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="product_active"
                checked={editFormData.product_active}
                onCheckedChange={handleSwitchChange}
                disabled={!isEditing}
              />
              <Label htmlFor="product_active">Product Active</Label>
            </div>
            {!isEditing && (
              <div className="text-sm text-gray-500 space-y-1 pt-4">
                <p>Feed: <Link href={`/dashboard/feeds/${product.feedId?._id}`} className="text-blue-600 hover:underline">{product.feedId?.name || 'N/A'}</Link></p>
                <p>Created By: {product.createdBy?.name || 'N/A'} ({product.createdBy?.email || 'N/A'})</p>
                <p>Created At: {format(new Date(product.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                <p>Last Updated: {format(new Date(product.lastUpdated), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Secțiunea Istoric Prețuri */}
      <div className="mt-6">
        {isHistoryLoading ? (
          <p>Loading price history...</p>
        ) : (
          <PriceHistoryDisplay history={priceHistory} />
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
