import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TextInput, FlatList, Image, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
  StatusBar, SafeAreaView, Platform, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from './config';

const PAGE_SIZE = 30;

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

const StockBadge = memo(function StockBadge({ stock }) {
  const bg    = stock > 5 ? '#dcfce7' : stock > 0 ? '#fef3c7' : '#fee2e2';
  const color = stock > 5 ? '#15803d' : stock > 0 ? '#92400e' : '#b91c1c';
  const label = stock > 0 ? `Stock: ${stock}` : 'Sin stock';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
});

const ProductCard = memo(function ProductCard({ item }) {
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
});

export default function App() {
  const [allProducts,  setAllProducts]  = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [showInStock,  setShowInStock]  = useState(false);
  const [activeCatIds, setActiveCatIds] = useState([]);   // plain array — React detects changes reliably
  const [catMenuOpen,  setCatMenuOpen]  = useState(false);
  const [page,         setPage]         = useState(1);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [resP, resC] = await Promise.all([
        fetch(`${API_URL}/productos`),
        fetch(`${API_URL}/categorias`),
      ]);
      const jsonP = await resP.json();
      const jsonC = await resC.json();
      if (!resP.ok) throw new Error(jsonP.message || 'Error al cargar productos');
      setAllProducts((jsonP.data || []).filter(p => p.activo != 0));
      setCategories(jsonC.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── filter (memoized — only recomputes when deps change) ── */
  const filtered = useMemo(() => {
    let list = allProducts;
    if (activeCatIds.length > 0)
      list = list.filter(p =>
        (p.categorias || []).some(c => activeCatIds.includes(Number(c.id)))
      );
    if (showInStock) list = list.filter(p => p.stock > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, activeCatIds, showInStock, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);
  const curPage    = Math.min(page, totalPages);
  const pageData   = useMemo(
    () => filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE),
    [filtered, curPage]
  );

  /* reset page on filter change */
  useEffect(() => { setPage(1); }, [search, showInStock, activeCatIds]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const toggleCat = useCallback((id) => {
    const nid = Number(id);
    setActiveCatIds(prev =>
      prev.includes(nid) ? prev.filter(x => x !== nid) : [...prev, nid]
    );
    setCatMenuOpen(false);   // close immediately so the user sees the result
  }, []);

  const clearCats = useCallback(() => { setActiveCatIds([]); setCatMenuOpen(false); }, []);

  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderItem    = useCallback(({ item }) => <ProductCard item={item} />, []);

  /* ── pagination footer ── */
  const PaginationFooter = useMemo(() => totalPages > 1 ? (
    <View style={styles.pagination}>
      <TouchableOpacity
        style={[styles.pageBtn, curPage === 1 && styles.pageBtnDisabled]}
        onPress={() => setPage(p => Math.max(1, p - 1))}
        disabled={curPage === 1}
      >
        <Ionicons name="chevron-back" size={16} color={curPage === 1 ? COLORS.border : COLORS.primary} />
        <Text style={[styles.pageBtnText, curPage === 1 && styles.pageBtnTextDisabled]}>Anterior</Text>
      </TouchableOpacity>

      <View style={{ alignItems: 'center' }}>
        <Text style={styles.pageInfo}>{curPage} / {totalPages}</Text>
        <Text style={styles.pageRange}>
          {(curPage - 1) * PAGE_SIZE + 1}–{Math.min(curPage * PAGE_SIZE, filtered.length)} de {filtered.length}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.pageBtn, curPage === totalPages && styles.pageBtnDisabled]}
        onPress={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={curPage === totalPages}
      >
        <Text style={[styles.pageBtnText, curPage === totalPages && styles.pageBtnTextDisabled]}>Siguiente</Text>
        <Ionicons name="chevron-forward" size={16} color={curPage === totalPages ? COLORS.border : COLORS.primary} />
      </TouchableOpacity>
    </View>
  ) : null, [totalPages, curPage, filtered.length]);

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

      {/* ── FILTER ROW ── */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.catBtn, activeCatIds.length > 0 && styles.catBtnActive]}
          onPress={() => setCatMenuOpen(true)}
        >
          <Ionicons name="menu" size={14} color={activeCatIds.length > 0 ? '#fff' : COLORS.muted} />
          <Text style={[styles.catBtnText, activeCatIds.length > 0 && styles.catBtnTextActive]}>
            Categorías{activeCatIds.length > 0 ? ` (${activeCatIds.length})` : ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color={activeCatIds.length > 0 ? '#fff' : COLORS.muted} />
        </TouchableOpacity>

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

        <Text style={styles.countLabel}>{filtered.length} prod.</Text>
      </View>

      {/* ── ACTIVE CAT CHIPS ── */}
      {activeCatIds.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeCatsBar}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 6, gap: 6, flexDirection: 'row' }}
        >
          {categories.filter(c => activeCatIds.includes(Number(c.id))).map(c => (
            <TouchableOpacity key={c.id} onPress={() => toggleCat(c.id)} style={styles.activeCatChip}>
              {c.icono ? <Text style={{ fontSize: 13 }}>{c.icono} </Text> : null}
              <Text style={styles.activeCatChipText}>{c.nombre}</Text>
              <Ionicons name="close" size={13} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── CONTENT — always a flex:1 container ── */}
      <View style={styles.content}>
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
            <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="cube-outline" size={56} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {search || activeCatIds.length > 0 ? 'Sin resultados' : 'No hay productos disponibles'}
            </Text>
            {activeCatIds.length > 0 && (
              <TouchableOpacity style={[styles.retryBtn, { marginTop: 12 }]} onPress={clearCats}>
                <Text style={styles.retryText}>Quitar filtro</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={pageData}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ListFooterComponent={PaginationFooter}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            initialNumToRender={10}
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
      </View>

      {/* ── CATEGORY MODAL (bottom sheet) ── */}
      <Modal
        visible={catMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCatMenuOpen(false)}
      >
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setCatMenuOpen(false)}>
          <View style={styles.catModal} onStartShouldSetResponder={() => true}>
            <View style={styles.catModalHeader}>
              <Text style={styles.catModalTitle}>Filtrar por categoría</Text>
              <TouchableOpacity onPress={() => setCatMenuOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false}>
              {/* Todas */}
              <TouchableOpacity
                style={[styles.catItem, activeCatIds.length === 0 && styles.catItemActive]}
                onPress={clearCats}
              >
                <View style={styles.catItemLeft}>
                  <View style={styles.catCheck}>
                    {activeCatIds.length === 0 && <Ionicons name="checkmark" size={14} color={COLORS.primary} />}
                  </View>
                  <Text style={[styles.catItemText, activeCatIds.length === 0 && styles.catItemTextActive]}>
                    Todas
                  </Text>
                </View>
              </TouchableOpacity>

              {categories.map(c => {
                const active = activeCatIds.includes(Number(c.id));
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catItem, active && styles.catItemActive]}
                    onPress={() => toggleCat(c.id)}
                  >
                    <View style={styles.catItemLeft}>
                      <View style={styles.catCheck}>
                        {active && <Ionicons name="checkmark" size={14} color={COLORS.primary} />}
                      </View>
                      {c.icono ? <Text style={{ fontSize: 15, marginRight: 6 }}>{c.icono}</Text> : null}
                      <Text style={[styles.catItemText, active && styles.catItemTextActive]}>{c.nombre}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {activeCatIds.length > 0 && (
              <View style={styles.catModalFooter}>
                <TouchableOpacity style={styles.clearCatsBtn} onPress={clearCats}>
                  <Text style={styles.clearCatsBtnText}>Limpiar filtro</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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

  /* Filter row */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  /* Category button */
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  catBtnActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catBtnText:       { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  catBtnTextActive: { color: '#fff' },

  /* Con stock chip */
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 99, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  filterChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  filterChipTextActive: { color: '#fff' },
  countLabel:           { fontSize: 12, color: COLORS.muted, marginLeft: 'auto' },

  /* Active category chips bar */
  activeCatsBar: { backgroundColor: '#eff6ff', maxHeight: 44 },
  activeCatChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeCatChipText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  /* Content area */
  content: { flex: 1, backgroundColor: COLORS.bg },
  list:    { flex: 1 },

  /* List */
  listContent: { padding: 10, paddingTop: 6, paddingBottom: 4 },
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
  imgContainer:   { width: '100%', height: 140, backgroundColor: COLORS.bg },
  img:            { width: '100%', height: 140, resizeMode: 'cover' },
  imgPlaceholder: { width: '100%', height: 140, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  cardBody:       { padding: 10 },
  productName:    { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4, lineHeight: 18 },
  productPrice:   { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  productTipo:    { fontSize: 11, color: COLORS.muted, marginBottom: 6 },

  /* Badge */
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  /* Pagination */
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: '#fff',
  },
  pageBtnDisabled:     { borderColor: COLORS.border },
  pageBtnText:         { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  pageBtnTextDisabled: { color: COLORS.border },
  pageInfo:            { fontSize: 13, fontWeight: '700', color: COLORS.text },
  pageRange:           { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  /* Category modal */
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  catModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  catModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catModalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  catItemActive:     { backgroundColor: '#eff6ff' },
  catItemLeft:       { flexDirection: 'row', alignItems: 'center' },
  catCheck:          { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  catItemText:       { fontSize: 14, color: COLORS.text },
  catItemTextActive: { fontWeight: '700', color: COLORS.primary },
  catModalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  clearCatsBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearCatsBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },

  /* States */
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.bg },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.muted },
  errorTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 6 },
  errorMsg:    { fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  retryBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText:   { fontSize: 14, color: COLORS.muted, marginTop: 14, textAlign: 'center' },
});
