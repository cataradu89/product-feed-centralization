'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import PriceHistoryDisplay from '@/components/PriceHistoryDisplay';

// Funcție pentru formatarea datelor fără a folosi date-fns
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

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

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: checked }));
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
    return <div className="p-4">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error || 'Product not found.'}</span>
        </div>
        <button 
          onClick={() => router.back()} 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {error && !isEditing && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">{isEditing ? 'Edit Product' : product.title}</h1>
            <p className="text-gray-500">Product ID: {product._id}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditToggle}
              className={`py-2 px-4 rounded ${isEditing ? 'bg-gray-300 hover:bg-gray-400' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            {!isEditing && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
        {error && isEditing && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Save Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                value={editFormData.title || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id="description"
                name="description"
                value={editFormData.description || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                rows="3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (RON)</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={editFormData.price || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label htmlFor="old_price" className="block text-sm font-medium text-gray-700 mb-1">Old Price (RON)</label>
                <input
                  id="old_price"
                  name="old_price"
                  type="number"
                  step="0.01"
                  value={editFormData.old_price || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                id="brand"
                name="brand"
                type="text"
                value={editFormData.brand || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  id="sku"
                  name="sku"
                  type="text"
                  value={editFormData.sku || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label htmlFor="ean" className="block text-sm font-medium text-gray-700 mb-1">EAN</label>
                <input
                  id="ean"
                  name="ean"
                  type="text"
                  value={editFormData.ean || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                <input
                  id="availability"
                  name="availability"
                  type="text"
                  value={editFormData.availability || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  value={editFormData.stock || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                id="category"
                name="category"
                type="text"
                value={editFormData.category || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label htmlFor="store" className="block text-sm font-medium text-gray-700 mb-1">Store</label>
              <input
                id="store"
                name="store"
                type="text"
                value={editFormData.store || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">Product URL</label>
              <input
                id="url"
                name="url"
                type="text"
                value={editFormData.url || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              {!isEditing && product.url && (
                <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 block">Visit Product Page</a>
              )}
            </div>
            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                id="image_url"
                name="image_url"
                type="text"
                value={editFormData.image_url || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              {!isEditing && product.image_url && (
                <img src={product.image_url} alt={product.title} className="mt-2 max-h-40 rounded" />
              )}
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="product_active"
                name="product_active"
                type="checkbox"
                checked={editFormData.product_active}
                onChange={handleCheckboxChange}
                disabled={!isEditing}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="product_active" className="text-sm font-medium text-gray-700">Product Active</label>
            </div>
            {!isEditing && (
              <div className="text-sm text-gray-500 space-y-1 pt-4">
                <p>Feed: <Link href={`/dashboard/feeds/${product.feedId?._id}`} className="text-blue-600 hover:underline">{product.feedId?.name || 'N/A'}</Link></p>
                <p>Created By: {product.createdBy?.name || 'N/A'} ({product.createdBy?.email || 'N/A'})</p>
                <p>Created At: {formatDate(product.createdAt)}</p>
                <p>Last Updated: {formatDate(product.lastUpdated)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secțiunea Istoric Prețuri */}
      <div className="mt-6">
        {isHistoryLoading ? (
          <p className="p-4">Loading price history...</p>
        ) : (
          <PriceHistoryDisplay history={priceHistory} />
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
