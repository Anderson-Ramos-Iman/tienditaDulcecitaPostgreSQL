import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Image, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
  StatusBar, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from './config';

const COLORS = {
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  primary:  '#3b82f6',
  text:     '#1e293b',
  muted:    '#64748b',
  border:   '#e2e8f0',
  success:  '#16a34a',
  warning:  '#d97706',
  danger:   '#dc2626',
  header:   '#0f172a',
};

function StockBadge({ stock }) {
  const bg    = stock > 5 ? '#dcfce7' : stock > 0 ? '#fef3c7' : '#fee2e2';
  const color = stock > 5 ? '#15803d' : stock > 0 ? '#92400e' : '#b91c1c';
  const label = stock > 0 ? `Stock: ${stock}` : 'Sin stock';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function ProductCard({ item }) {
  const [imgError, setImgError] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.imgContainer}>
        {item.imagen_url && !imgError ? (
          <Image
            source={{ uri: item.imagen_url }}
            style={styles.img}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Ionicons name="cube-outline" size={40} color={COLORS.border} />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
        <Text style={styles.productPrice}>
          S/ {parseFloat(item.precio_base).toFixed(2)}
        </Text>
        <Text style={styles.productTipo}>
          {item.tipo_venta === 'por_peso' ? 'Por peso / kg' : 'Por unidad'}
        </Text>
        <StockBadge stock={item.stock} />
      </View>
    </View>
  );
}

export default function App() {
  const [allProducts, setAllProducts]   = useState([]);
  const [filtered,    setFiltered]      = useState([]);
  const [search,      setSearch]        = useState('');
  const [loading,     setLoading]       = useState(true);
  const [refreshing,  setRefreshing]    = useState(false);
  const [error,       setError]         = useState(null);
  const [showInStock, setShowInStock]   = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const res  = await fetch(`${API_URL}/productos`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al cargar productos');
      const activos = (json.data || []).filter(p => p.activo != 0);
      setAllProducts(activos);
      setFiltered(activos);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    let list = allProducts;
    if (showInStock) list = list.filter(p => p.stock > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q));
    }
    setFiltered(list);
  }, [search, allProducts, showInStock]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.header} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Ionicons name="storefront" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Tiendita Dulcecita</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── FILTERS ── */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, showInStock && styles.filterChipActive]}
          onPress={() => setShowInStock(v => !v)}
        >
          <Ionicons
            name={showInStock ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={showInStock ? '#fff' : COLORS.muted}
          />
          <Text style={[styles.filterChipText, showInStock && styles.filterChipTextActive]}>
            Con stock
          </Text>
        </TouchableOpacity>
        <Text style={styles.countLabel}>
          {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── CONTENT ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={56} color={COLORS.border} />
          <Text style={styles.errorTitle}>No se pudo conectar</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={56} color={COLORS.border} />
          <Text style={styles.emptyText}>
            {search ? 'Sin resultados para tu búsqueda' : 'No hay productos disponibles'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ProductCard item={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.header },

  /* Header */
  header: {
    backgroundColor: COLORS.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    paddingBottom: 12,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon:    { width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  refreshBtn:  { padding: 6 },

  /* Search */
  searchBar: {
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },

  /* Filters */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 99, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  filterChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  filterChipTextActive: { color: '#fff' },
  countLabel:           { fontSize: 12, color: COLORS.muted },

  /* List */
  listContent: { padding: 10, paddingTop: 6, backgroundColor: COLORS.bg },
  row:         { justifyContent: 'space-between', marginBottom: 0 },

  /* Card */
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    margin: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  imgContainer: { width: '100%', height: 140, backgroundColor: COLORS.bg },
  img:          { width: '100%', height: 140, resizeMode: 'cover' },
  imgPlaceholder: {
    width: '100%', height: 140,
    backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody:       { padding: 10 },
  productName:    { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4, lineHeight: 18 },
  productPrice:   { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  productTipo:    { fontSize: 11, color: COLORS.muted, marginBottom: 6 },

  /* Badge */
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  /* States */
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.bg },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.muted },
  errorTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 6 },
  errorMsg:    { fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  retryBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText:   { fontSize: 14, color: COLORS.muted, marginTop: 14, textAlign: 'center' },
});
