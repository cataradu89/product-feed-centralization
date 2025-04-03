'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PriceHistoryDisplay = ({ history = [] }) => {
  const [timeframe, setTimeframe] = useState('all');

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Istoric Prețuri</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nu există istoric de prețuri disponibil pentru acest produs.</p>
        </CardContent>
      </Card>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Istoric Prețuri</CardTitle>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selectează perioada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tot istoricul</SelectItem>
            <SelectItem value="week">Ultima săptămână</SelectItem>
            <SelectItem value="month">Ultima lună</SelectItem>
            <SelectItem value="year">Ultimul an</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Statistici */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-100 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Preț curent</div>
            <div className="text-xl font-semibold">{stats.current.toFixed(2)} RON</div>
          </div>
          <div className="bg-slate-100 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Preț minim</div>
            <div className="text-xl font-semibold">{stats.min.toFixed(2)} RON</div>
          </div>
          <div className="bg-slate-100 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Preț maxim</div>
            <div className="text-xl font-semibold">{stats.max.toFixed(2)} RON</div>
          </div>
          <div className="bg-slate-100 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Preț mediu</div>
            <div className="text-xl font-semibold">{stats.avg.toFixed(2)} RON</div>
          </div>
          <div className="bg-slate-100 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Modificări de preț</div>
            <div className="text-xl font-semibold">{stats.changes}</div>
          </div>
        </div>
        
        {/* Tabel istoric */}
        {filteredHistory.length === 0 ? (
          <p className="text-muted-foreground">Nu există date pentru perioada selectată.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Modificării</TableHead>
                <TableHead className="text-right">Preț Nou</TableHead>
                <TableHead className="text-right">Preț Vechi</TableHead>
                <TableHead className="text-right">Modificare</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((entry) => {
                const changePercent = calculateChangePercent(entry.price, entry.oldPrice);
                const isIncrease = entry.oldPrice !== null && entry.price > entry.oldPrice;
                const isDecrease = entry.oldPrice !== null && entry.price < entry.oldPrice;
                
                return (
                  <TableRow key={entry._id}>
                    <TableCell>{format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="text-right font-medium">{entry.price.toFixed(2)} RON</TableCell>
                    <TableCell className="text-right">
                      {entry.oldPrice !== null ? `${entry.oldPrice.toFixed(2)} RON` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {changePercent !== null ? (
                        <Badge variant={isIncrease ? "destructive" : isDecrease ? "success" : "outline"}>
                          {isIncrease ? '▲' : isDecrease ? '▼' : ''}
                          {' '}
                          {Math.abs(changePercent)}%
                        </Badge>
                      ) : (
                        <Badge variant="outline">Prima înregistrare</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceHistoryDisplay;
