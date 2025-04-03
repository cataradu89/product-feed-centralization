'use client';

import React, { useState } from 'react';

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

const PriceHistoryDisplay = ({ history = [] }) => {
  const [timeframe, setTimeframe] = useState('all');

  if (!history || history.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="border-b pb-4 mb-4">
          <h2 className="text-xl font-semibold">Istoric Prețuri</h2>
        </div>
        <p className="text-gray-500">Nu există istoric de prețuri disponibil pentru acest produs.</p>
      </div>
    );
  }

  // Calculează statistici
  const calculateStats = () => {
    if (history.length === 0) return { min: 0, max: 0, avg: 0, current: 0, changes: 0 };
    
    const prices = history.map(entry => entry.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const current = history[history.length - 1].price;
    const changes = history.filter(entry => entry.oldPrice !== null).length;
    
    return { min, max, avg, current, changes };
  };

  const stats = calculateStats();
  
  // Filtrează istoricul în funcție de timeframe
  const getFilteredHistory = () => {
    if (timeframe === 'all') return history;
    
    const now = new Date();
    let cutoffDate;
    
    if (timeframe === 'week') {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      cutoffDate = new Date(now);
      cutoffDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'year') {
      cutoffDate = new Date(now);
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }
    
    return history.filter(entry => new Date(entry.timestamp) >= cutoffDate);
  };
  
  const filteredHistory = getFilteredHistory();
  
  // Calculează procentajul de schimbare pentru fiecare intrare
  const calculateChangePercent = (newPrice, oldPrice) => {
    if (oldPrice === null || oldPrice === 0) return null;
    const percent = ((newPrice - oldPrice) / oldPrice) * 100;
    return percent.toFixed(2);
  };

  const handleTimeframeChange = (e) => {
    setTimeframe(e.target.value);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex flex-row items-center justify-between border-b pb-4 mb-4">
        <h2 className="text-xl font-semibold">Istoric Prețuri</h2>
        <select 
          value={timeframe} 
          onChange={handleTimeframeChange}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Tot istoricul</option>
          <option value="week">Ultima săptămână</option>
          <option value="month">Ultima lună</option>
          <option value="year">Ultimul an</option>
        </select>
      </div>
      
      {/* Statistici */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-100 p-3 rounded-lg">
          <div className="text-sm text-gray-500">Preț curent</div>
          <div className="text-xl font-semibold">{stats.current.toFixed(2)} RON</div>
        </div>
        <div className="bg-slate-100 p-3 rounded-lg">
          <div className="text-sm text-gray-500">Preț minim</div>
          <div className="text-xl font-semibold">{stats.min.toFixed(2)} RON</div>
        </div>
        <div className="bg-slate-100 p-3 rounded-lg">
          <div className="text-sm text-gray-500">Preț maxim</div>
          <div className="text-xl font-semibold">{stats.max.toFixed(2)} RON</div>
        </div>
        <div className="bg-slate-100 p-3 rounded-lg">
          <div className="text-sm text-gray-500">Preț mediu</div>
          <div className="text-xl font-semibold">{stats.avg.toFixed(2)} RON</div>
        </div>
        <div className="bg-slate-100 p-3 rounded-lg">
          <div className="text-sm text-gray-500">Modificări de preț</div>
          <div className="text-xl font-semibold">{stats.changes}</div>
        </div>
      </div>
      
      {/* Tabel istoric */}
      {filteredHistory.length === 0 ? (
        <p className="text-gray-500">Nu există date pentru perioada selectată.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Modificării</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preț Nou</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preț Vechi</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Modificare</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((entry) => {
                const changePercent = calculateChangePercent(entry.price, entry.oldPrice);
                const isIncrease = entry.oldPrice !== null && entry.price > entry.oldPrice;
                const isDecrease = entry.oldPrice !== null && entry.price < entry.oldPrice;
                
                return (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {entry.price.toFixed(2)} RON
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {entry.oldPrice !== null ? `${entry.oldPrice.toFixed(2)} RON` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {changePercent !== null ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isIncrease ? 'bg-red-100 text-red-800' : isDecrease ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isIncrease ? '▲' : isDecrease ? '▼' : ''}
                          {' '}
                          {Math.abs(changePercent)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Prima înregistrare
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PriceHistoryDisplay;
