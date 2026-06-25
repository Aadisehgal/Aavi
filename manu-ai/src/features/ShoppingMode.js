// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/ShoppingMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView, TextInput,
} from 'react-native';

const { ShoppingBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const ShoppingMode = ({ isActive, onClose }) => {
  const [shoppingList, setShoppingList] = useState([
    { id: 1, name: 'Milk', checked: false, price: 3.50 },
    { id: 2, name: 'Bread', checked: false, price: 2.50 },
    { id: 3, name: 'Eggs', checked: false, price: 4.00 },
    { id: 4, name: 'Butter', checked: false, price: 3.00 },
  ]);
  const [newItem, setNewItem] = useState('');
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [priceCompare, setPriceCompare] = useState([
    { product: 'Organic Milk', store: 'Store A', price: 3.50, distance: '0.5km' },
    { product: 'Organic Milk', store: 'Store B', price: 3.20, distance: '1.2km' },
    { product: 'Organic Milk', store: 'Store C', price: 3.80, distance: '0.8km' },
  ]);
  const [budget, setBudget] = useState(50);
  const [spent, setSpent] = useState(0);
  const [scannerActive, setScannerActive] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); setScannerActive(false); }
  }, [isActive]);

  useEffect(() => {
    if (scannerActive) {
      Animated.loop(Animated.sequence([Animated.timing(scanLineAnim, { toValue: 1, duration: 1500, useNativeDriver: true }), Animated.timing(scanLineAnim, { toValue: 0, duration: 1500, useNativeDriver: true })])).start();
    } else { scanLineAnim.setValue(0); }
  }, [scannerActive]);

  const addItem = () => { if (newItem.trim()) { setShoppingList(prev => [...prev, { id: Date.now(), name: newItem.trim(), checked: false, price: 0 }]); setNewItem(''); } };
  const toggleItem = (id) => { setShoppingList(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)); };
  const removeItem = (id) => { setShoppingList(prev => prev.filter(item => item.id !== id)); };
  const simulateScan = () => {
    setScannerActive(true);
    setTimeout(() => { setScannerActive(false); setBarcodeResult({ code: '123456789', product: 'Sample Product', price: 9.99 }); }, 3000);
  };

  const totalCost = shoppingList.filter(i => i.checked).reduce((sum, i) => sum + (i.price || 0), 0);
  const remaining = budget - totalCost;

  const renderBudget = () => (
    <View style={styles.budgetCard}>
      <Text style={styles.cardTitle}>Budget</Text>
      <View style={styles.budgetBar}><View style={[styles.budgetFill, { width: `${Math.min(100, (totalCost / budget) * 100)}%`, backgroundColor: remaining > 10 ? '#00ff88' : remaining > 0 ? '#ffaa00' : '#ff4444' }]} /></View>
      <View style={styles.budgetRow}>
        <Text style={styles.budgetText}>Spent: ${totalCost.toFixed(2)}</Text>
        <Text style={styles.budgetText}>Remaining: ${remaining.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderShoppingList = () => (
    <View style={styles.listCard}>
      <Text style={styles.cardTitle}>Shopping List</Text>
      <View style={styles.addRow}>
        <TextInput style={styles.addInput} placeholder="Add item..." placeholderTextColor="rgba(0,255,255,0.3)" value={newItem} onChangeText={setNewItem} />
        <TouchableOpacity style={styles.addBtn} onPress={addItem}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
      </View>
      {shoppingList.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <TouchableOpacity onPress={() => toggleItem(item.id)}><Text style={[styles.listCheck, item.checked && styles.listChecked]}>{item.checked ? '✓' : '○'}</Text></TouchableOpacity>
          <Text style={[styles.listName, item.checked && styles.listNameChecked]}>{item.name}</Text>
          <Text style={styles.listPrice}>${item.price.toFixed(2)}</Text>
          <TouchableOpacity onPress={() => removeItem(item.id)}><Text style={styles.listRemove}>✕</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderBarcodeScanner = () => (
    <View style={styles.scannerCard}>
      <Text style={styles.cardTitle}>Barcode Scanner</Text>
      <View style={styles.scannerView}>
        <View style={styles.scannerFrame}>
          {scannerActive && <Animated.View style={[styles.scanLine, { top: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 180] }) }]} />}
        </View>
        {!scannerActive && !barcodeResult && <TouchableOpacity style={styles.scanBtn} onPress={simulateScan}><Text style={styles.scanBtnText}>📷 Scan Barcode</Text></TouchableOpacity>}
        {barcodeResult && <View style={styles.scanResult}><Text style={styles.scanProduct}>{barcodeResult.product}</Text><Text style={styles.scanPrice}>${barcodeResult.price.toFixed(2)}</Text><TouchableOpacity onPress={() => setBarcodeResult(null)}><Text style={styles.scanReset}>Scan Again</Text></TouchableOpacity></View>}
      </View>
    </View>
  );

  const renderPriceCompare = () => (
    <View style={styles.compareCard}>
      <Text style={styles.cardTitle}>Price Compare</Text>
      {priceCompare.map((item, i) => (
        <View key={i} style={styles.compareRow}>
          <View style={styles.compareInfo}><Text style={styles.compareStore}>{item.store}</Text><Text style={styles.compareDistance}>{item.distance}</Text></View>
          <Text style={[styles.comparePrice, i === 1 && styles.compareBest]}>${item.price.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Shopping</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderBudget()}{renderShoppingList()}{renderBarcodeScanner()}{renderPriceCompare()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000810', zIndex: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.1)' },
  headerTitle: { color: '#00ffff', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 50, 50, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 100, 100, 0.3)' },
  closeText: { color: '#ff6666', fontSize: 16, fontWeight: 'bold' },
  scroll: { flex: 1 },
  budgetCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  budgetBar: { height: 8, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  budgetFill: { height: '100%', borderRadius: 4 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetText: { color: 'rgba(0, 255, 255, 0.6)', fontSize: 12 },
  listCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  addRow: { flexDirection: 'row', marginBottom: 12 },
  addInput: { flex: 1, color: '#ccffff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  addBtnText: { color: '#00ffff', fontSize: 20, fontWeight: 'bold' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  listCheck: { color: 'rgba(0, 255, 255, 0.3)', fontSize: 16, width: 24 },
  listChecked: { color: '#00ff88' },
  listName: { color: '#ccffff', fontSize: 14, flex: 1 },
  listNameChecked: { textDecorationLine: 'line-through', color: 'rgba(0, 255, 255, 0.3)' },
  listPrice: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, width: 50, textAlign: 'right' },
  listRemove: { color: '#ff6666', fontSize: 14, width: 30, textAlign: 'right' },
  scannerCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  scannerView: { alignItems: 'center' },
  scannerFrame: { width: 200, height: 200, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(0, 255, 255, 0.3)', overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(0, 10, 20, 0.8)', marginBottom: 12 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#00ff88' },
  scanBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 255, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.3)' },
  scanBtnText: { color: '#00ffff', fontSize: 14 },
  scanResult: { alignItems: 'center' },
  scanProduct: { color: '#00ffff', fontSize: 16, fontWeight: 'bold' },
  scanPrice: { color: '#00ff88', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  scanReset: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 8 },
  compareCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  compareInfo: { flex: 1 },
  compareStore: { color: '#ccffff', fontSize: 13 },
  compareDistance: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 10 },
  comparePrice: { color: '#00ffff', fontSize: 16, fontWeight: 'bold' },
  compareBest: { color: '#00ff88' },
});

export default ShoppingMode;
