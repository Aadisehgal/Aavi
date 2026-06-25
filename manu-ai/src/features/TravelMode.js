// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 16/20 — Advanced Interface Features 76-100
// File: src/features/TravelMode.js
// Generated: 2026-06-24

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions,
  NativeModules, ScrollView,
} from 'react-native';

const { TravelBridge } = NativeModules;
const { width: SCREEN_W } = Dimensions.get('window');

const TravelMode = ({ isActive, onClose }) => {
  const [boardingPass, setBoardingPass] = useState({
    flight: 'AI2026', from: 'JFK', to: 'LHR', gate: 'A12', seat: '14B', boarding: '10:30', departure: '11:00',
  });
  const [translations, setTranslations] = useState([
    { phrase: 'Hello', target: 'Bonjour', lang: 'French' },
    { phrase: 'Thank you', target: 'Merci', lang: 'French' },
    { phrase: 'Where is...', target: 'Où est...', lang: 'French' },
  ]);
  const [currency, setCurrency] = useState({ from: 'USD', to: 'EUR', rate: 0.92, amount: 100 });
  const [itinerary, setItinerary] = useState([
    { time: '09:00', activity: 'Airport arrival', location: 'JFK Terminal 4' },
    { time: '10:30', activity: 'Boarding', location: 'Gate A12' },
    { time: '11:00', activity: 'Departure', location: 'Flight AI2026' },
    { time: '22:00', activity: 'Arrival', location: 'LHR Terminal 5' },
  ]);
  const [weather, setWeather] = useState({ temp: 18, condition: 'Cloudy', city: 'London' });
  const [offlineMode, setOfflineMode] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState(['+1-555-0100', '+44-20-7946-0958']);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }
    else { Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }
  }, [isActive]);

  const convertCurrency = () => (currency.amount * currency.rate).toFixed(2);

  const renderBoardingPass = () => (
    <View style={styles.boardingCard}>
      <Text style={styles.boardingHeader}>✈️ Boarding Pass</Text>
      <View style={styles.flightRow}>
        <View style={styles.flightCol}><Text style={styles.flightCode}>{boardingPass.from}</Text><Text style={styles.flightLabel}>From</Text></View>
        <Text style={styles.flightArrow}>→</Text>
        <View style={styles.flightCol}><Text style={styles.flightCode}>{boardingPass.to}</Text><Text style={styles.flightLabel}>To</Text></View>
      </View>
      <View style={styles.boardingDetails}>
        <View style={styles.boardingItem}><Text style={styles.boardingValue}>{boardingPass.flight}</Text><Text style={styles.boardingLabel}>Flight</Text></View>
        <View style={styles.boardingItem}><Text style={styles.boardingValue}>{boardingPass.gate}</Text><Text style={styles.boardingLabel}>Gate</Text></View>
        <View style={styles.boardingItem}><Text style={styles.boardingValue}>{boardingPass.seat}</Text><Text style={styles.boardingLabel}>Seat</Text></View>
        <View style={styles.boardingItem}><Text style={styles.boardingValue}>{boardingPass.boarding}</Text><Text style={styles.boardingLabel}>Boarding</Text></View>
      </View>
    </View>
  );

  const renderItinerary = () => (
    <View style={styles.itineraryCard}>
      <Text style={styles.cardTitle}>Itinerary</Text>
      {itinerary.map((item, i) => (
        <View key={i} style={styles.itineraryRow}>
          <View style={styles.itineraryDot} /><View style={styles.itineraryLine} />
          <View style={styles.itineraryContent}>
            <Text style={styles.itineraryTime}>{item.time}</Text>
            <Text style={styles.itineraryActivity}>{item.activity}</Text>
            <Text style={styles.itineraryLocation}>{item.location}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderTranslator = () => (
    <View style={styles.translatorCard}>
      <Text style={styles.cardTitle}>Quick Translator</Text>
      {translations.map((t, i) => (
        <View key={i} style={styles.translationRow}>
          <Text style={styles.sourceText}>{t.phrase}</Text>
          <Text style={styles.transArrow}>→</Text>
          <Text style={styles.targetText}>{t.target}</Text>
          <Text style={styles.langTag}>{t.lang}</Text>
        </View>
      ))}
    </View>
  );

  const renderCurrency = () => (
    <View style={styles.currencyCard}>
      <Text style={styles.cardTitle}>Currency Converter</Text>
      <View style={styles.currencyRow}>
        <View style={styles.currencyBox}><Text style={styles.currencyValue}>{currency.amount}</Text><Text style={styles.currencyCode}>{currency.from}</Text></View>
        <Text style={styles.currencyArrow}>⇄</Text>
        <View style={styles.currencyBox}><Text style={styles.currencyValue}>{convertCurrency()}</Text><Text style={styles.currencyCode}>{currency.to}</Text></View>
      </View>
      <Text style={styles.rateText}>1 {currency.from} = {currency.rate} {currency.to}</Text>
    </View>
  );

  const renderWeather = () => (
    <View style={styles.weatherCard}>
      <Text style={styles.weatherEmoji}>🌤️</Text>
      <View style={styles.weatherInfo}>
        <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
        <Text style={styles.weatherCondition}>{weather.condition}</Text>
        <Text style={styles.weatherCity}>{weather.city}</Text>
      </View>
    </View>
  );

  const renderEmergency = () => (
    <View style={styles.emergencyCard}>
      <Text style={styles.cardTitle}>Emergency Contacts</Text>
      {emergencyContacts.map((contact, i) => (
        <View key={i} style={styles.emergencyRow}><Text style={styles.emergencyIcon}>🚨</Text><Text style={styles.emergencyNumber}>{contact}</Text></View>
      ))}
      <TouchableOpacity style={[styles.offlineBtn, offlineMode && styles.offlineBtnActive]} onPress={() => setOfflineMode(!offlineMode)}>
        <Text style={styles.offlineText}>{offlineMode ? '✓ Offline Maps Ready' : 'Download Offline Maps'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isActive) return null;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✈️ Travel</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderBoardingPass()}{renderItinerary()}{renderTranslator()}{renderCurrency()}{renderWeather()}{renderEmergency()}
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
  boardingCard: { margin: 16, padding: 20, borderRadius: 20, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  boardingHeader: { color: '#00ffff', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  flightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  flightCol: { alignItems: 'center', flex: 1 },
  flightCode: { color: '#00ffff', fontSize: 32, fontWeight: 'bold' },
  flightLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 4 },
  flightArrow: { color: '#00ffff', fontSize: 24 },
  boardingDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  boardingItem: { alignItems: 'center' },
  boardingValue: { color: '#00ffcc', fontSize: 18, fontWeight: 'bold' },
  boardingLabel: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 10, marginTop: 4 },
  itineraryCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  cardTitle: { color: '#00ffff', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  itineraryRow: { flexDirection: 'row', paddingVertical: 10 },
  itineraryDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00ffff', marginRight: 12, marginTop: 4 },
  itineraryLine: { width: 2, backgroundColor: 'rgba(0, 255, 255, 0.2)', marginRight: 12 },
  itineraryContent: { flex: 1 },
  itineraryTime: { color: '#00ffcc', fontSize: 13, fontWeight: '600' },
  itineraryActivity: { color: '#ccffff', fontSize: 14, marginTop: 2 },
  itineraryLocation: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 11, marginTop: 2 },
  translatorCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  translationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  sourceText: { color: '#ccffff', fontSize: 14, flex: 1 },
  transArrow: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 14, marginHorizontal: 8 },
  targetText: { color: '#00ff88', fontSize: 14, flex: 1 },
  langTag: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 10 },
  currencyCard: { margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  currencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  currencyBox: { alignItems: 'center', flex: 1 },
  currencyValue: { color: '#00ffff', fontSize: 24, fontWeight: 'bold' },
  currencyCode: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 4 },
  currencyArrow: { color: '#00ffff', fontSize: 20, marginHorizontal: 16 },
  rateText: { color: 'rgba(0, 255, 255, 0.4)', fontSize: 11, textAlign: 'center' },
  weatherCard: { flexDirection: 'row', alignItems: 'center', margin: 16, marginTop: 0, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  weatherEmoji: { fontSize: 40, marginRight: 16 },
  weatherInfo: { flex: 1 },
  weatherTemp: { color: '#00ffff', fontSize: 24, fontWeight: 'bold' },
  weatherCondition: { color: 'rgba(0, 255, 255, 0.7)', fontSize: 14 },
  weatherCity: { color: 'rgba(0, 255, 255, 0.5)', fontSize: 12, marginTop: 4 },
  emergencyCard: { margin: 16, marginTop: 0, marginBottom: 32, padding: 16, borderRadius: 16, backgroundColor: 'rgba(0, 20, 40, 0.8)', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 255, 255, 0.05)' },
  emergencyIcon: { fontSize: 16, marginRight: 8 },
  emergencyNumber: { color: '#ff6666', fontSize: 14, fontWeight: '600' },
  offlineBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 30, 60, 0.6)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 255, 255, 0.15)' },
  offlineBtnActive: { backgroundColor: 'rgba(0, 255, 100, 0.15)', borderColor: 'rgba(0, 255, 100, 0.3)' },
  offlineText: { color: '#ccffff', fontSize: 13 },
});

export default TravelMode;
