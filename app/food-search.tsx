import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Image as RNImage,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Shadows, Spacing, Radius } from '@/constants/theme';
import { ActionSearchIcon, ActionChevronDownIcon, ActionCheckIcon, MenuArrowLeftIcon, MenuChevronRightIcon } from '@/components/MenuIcons';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from '@/lib/menuContext';
import Logo from '../assets/images/logo.svg';
import { NoImagePlaceholder } from '@/components/NoImagePlaceholder';
import { MenuModal } from '@/components/MenuModal';
import { LottieLoader } from '@/components/LottieLoader';
import { sentenceCase } from '@/lib/text';
import { safeBack } from '@/lib/safeBack';
import { usePageTransition } from '@/lib/usePageTransition';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useRegion, REGIONS, FLAG_IMAGES, PlusTag } from '@/lib/regionContext';
import type { Region } from '@/lib/regionContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// ─── Nutriscore colours ─────────────────────────────────────────────────────
const NUTRISCORE_COLORS: Record<string, string> = {
  a: '#009a1f',
  b: '#b8d828',
  c: '#ffc72d',
  d: '#ff8736',
  e: '#ff3f42',
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface SearchProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  nutriscore_grade?: string;
  quantity?: string;
}

const DEBOUNCE_MS = 500;
const PAGE_SIZE = 24;
const SEARCH_FIELDS = 'code,product_name,brands,image_front_small_url,nutriscore_grade,quantity';
// Use the classic CGI search API with region subdomains — the Search-A-Licious
// endpoint (search.openfoodfacts.org) ignores country filters entirely.
const SEARCH_PATH = 'openfoodfacts.org/cgi/search.pl';

export default function FoodSearchScreen() {
  const { t } = useTranslation('scanner');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  const { session } = useAuth();

  // Page-level entrance/exit animation
  const { opacity: pageOpacity, translateX: pageTranslateX, animateExit: pageExit } = usePageTransition();

  const { selectedRegion, setSelectedRegion } = useRegion();
  const { menuOpen, menuVisible, menuAnim, openMenu, closeMenu, closeMenuInstant } = useMenu();
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pageRef = useRef(1);
  const currentTermRef = useRef('');
  const inputRef = useRef<TextInput>(null);
  // Keep a ref to selectedRegion so the debounce timeout always reads the latest value
  const regionRef = useRef(selectedRegion);
  regionRef.current = selectedRegion;

  /** Handle region selection — gate premium regions behind Plus (UK always free) */
  function handleRegionSelect(region: Region) {
    if (region.code !== 'gb' && !isPlus) {
      setRegionPickerVisible(false);
      showUpsell();
      return;
    }
    setSelectedRegion(region);
    regionRef.current = region;           // update ref immediately
    setRegionPickerVisible(false);
    // Re-search with new region using whatever is in the search field
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      setLoading(true);
      setResults([]);
      performSearch(trimmed, region);
    }
  }

  // ── Debounced search — fires a fresh API call every time query changes ──────
  useEffect(() => {
    // Always clear previous debounce first
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const trimmed = query.trim();

    // Reset state when input is cleared
    if (!trimmed) {
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
      setHasMore(false);
      setSubmittedQuery('');
      return undefined;
    }

    // Don't auto-search until at least 2 characters
    if (trimmed.length < 2) return undefined;

    // Show loading immediately so there's no flash of "no results" during debounce
    setLoading(true);
    setHasSearched(true);

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      // Always read region from ref (avoids stale closure)
      performSearch(trimmed, regionRef.current);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query]);

  /** Score a product's relevance to the search term (higher = more relevant) */
  function scoreRelevance(product: SearchProduct, term: string): number {
    const name = (product.product_name || '').toLowerCase();
    const brand = (product.brands || '').toLowerCase();
    const combined = `${brand} ${name}`;
    const lowerTerm = term.toLowerCase();
    const words = lowerTerm.split(/\s+/).filter(Boolean);

    let score = 0;

    // ── Exact & near-exact matches (highest tier) ──
    if (name === lowerTerm) score += 100000;
    else if (`${brand} ${name}`.trim() === lowerTerm) score += 95000;
    else if (name.startsWith(lowerTerm + ' ') || name === lowerTerm) score += 85000;
    else if (name.startsWith(lowerTerm)) score += 80000;
    else if (name.includes(lowerTerm)) score += 70000;
    else if (combined.includes(lowerTerm)) score += 60000;

    // ── Word-level matching ──
    if (words.length > 0) {
      const nameHits = words.filter((w) => name.includes(w)).length;
      const combinedHits = words.filter((w) => combined.includes(w)).length;

      // All words in name
      if (nameHits === words.length) score += 50000;
      // All words across name + brand
      else if (combinedHits === words.length) score += 40000;
      // Partial match: proportional score
      else score += Math.round((combinedHits / words.length) * 30000);

      // Word-position bonuses
      for (const w of words) {
        if (name.startsWith(w + ' ') || name.startsWith(w)) score += 1200;
        else if (name.includes(` ${w}`)) score += 800;   // word boundary
        else if (name.includes(w)) score += 400;
        if (brand.startsWith(w + ' ') || brand.startsWith(w)) score += 900;
        else if (brand.includes(w)) score += 300;
      }
    }

    // ── Data quality & popularity bonuses ──
    if (product.image_front_small_url) score += 200;
    if (product.nutriscore_grade) score += 100;
    const comp = product.completeness ?? 0;
    score += Math.round(comp * 150);
    const scans = product.unique_scans_n ?? 0;
    if (scans > 0) score += Math.min(Math.round(Math.log10(scans) * 50), 250);

    return score;
  }

  /** Sort results by relevance — the Search-A-Licious API handles text matching,
   *  so we only remove nameless products and re-rank client-side. */
  function processResults(products: SearchProduct[], searchTerm: string): SearchProduct[] {
    // Only remove products that are completely nameless
    const named = products.filter(
      (p) => p.product_name && p.product_name.trim() !== '',
    );
    // Score and sort by relevance (no client-side filtering — trust the API)
    const scored = named.map((p, i) => ({
      product: p,
      relevance: scoreRelevance(p, searchTerm),
      apiOrder: i,
    }));
    scored.sort((a, b) => b.relevance - a.relevance || a.apiOrder - b.apiOrder);
    return scored.map((s) => s.product);
  }

  /** Generate alternative search terms for fuzzy matching.
   *  e.g. "ploughmans" → ["ploughman's", "ploughmans"], "crisps" → ["crisp"] */
  function getQueryVariants(term: string): string[] {
    const variants: string[] = [];
    const lower = term.toLowerCase();

    // Add/remove apostrophes: "ploughmans" → "ploughman's", "mans" → "man's"
    if (!lower.includes("'")) {
      // Try inserting apostrophe before trailing s
      if (lower.endsWith('mans')) variants.push(term.slice(0, -1) + "'s");
      if (lower.endsWith('ns')) variants.push(term.slice(0, -1) + "'s");
      if (lower.endsWith('es')) variants.push(term.slice(0, -2) + "'s");
      if (lower.endsWith('s') && !lower.endsWith("'s")) variants.push(term.slice(0, -1) + "'s");
    } else {
      // Strip apostrophes: "ploughman's" → "ploughmans"
      variants.push(term.replace(/'/g, ''));
    }

    // Try without trailing s: "crisps" → "crisp"
    if (lower.endsWith('s') && lower.length > 3) variants.push(term.slice(0, -1));

    // Try with trailing s: "sandwich" → "sandwiches", "crisp" → "crisps"
    if (!lower.endsWith('s')) {
      variants.push(term + 's');
      if (lower.endsWith('ch') || lower.endsWith('sh') || lower.endsWith('x')) {
        variants.push(term + 'es');
      }
    }

    // Deduplicate and remove the original
    return [...new Set(variants)].filter(v => v.toLowerCase() !== lower);
  }

  /** Build the Search-A-Licious query URL */
  function buildSearchUrl(searchTerm: string, region: Region, page: number): string {
    // Classic CGI search — region subdomain handles country filtering natively
    const subdomain = region.subdomain || 'world';
    const params = new URLSearchParams({
      search_terms: searchTerm,
      search_simple: '1',
      action: 'process',
      json: '1',
      lc: 'en',
      page: String(page),
      page_size: String(PAGE_SIZE),
      fields: SEARCH_FIELDS,
    });
    return `https://${subdomain}.${SEARCH_PATH}?${params.toString()}`;
  }

  /** Normalise a product from the Search-A-Licious response.
   *  brands comes back as string[] — join to a single string. */
  function normaliseHit(hit: Record<string, unknown>): SearchProduct {
    const brands = hit.brands;
    return {
      ...hit,
      brands: Array.isArray(brands) ? brands.join(', ') : (brands as string) ?? '',
    } as SearchProduct;
  }

  /** Perform a fresh search against the OFF classic CGI search API */
  async function performSearch(searchTerm: string, region: Region) {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSubmittedQuery(searchTerm);
    setHasSearched(true);
    setServerError(false);
    pageRef.current = 1;
    currentTermRef.current = searchTerm;

    try {
      const url = buildSearchUrl(searchTerm, region, 1);

      let res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
      });

      // Retry up to 2 times on rate limit (429) or server error (503) with increasing backoff
      for (let attempt = 1; attempt <= 2 && (res.status === 429 || res.status === 503); attempt++) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
        });
      }

      // If regional endpoint is still failing, try the global endpoint as fallback
      if (!res.ok && region.subdomain && region.subdomain !== 'world') {
        console.warn(`[FoodSearch] Regional endpoint failed (${res.status}), falling back to global`);
        const globalUrl = buildSearchUrl(searchTerm, { ...region, subdomain: 'world' } as Region, 1);
        const globalRes = await fetch(globalUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
        });
        if (globalRes.ok) res = globalRes;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Classic API returns `products`
      let products: SearchProduct[] = (data.products ?? []).map(normaliseHit);
      let sorted = processResults(products, searchTerm);
      let finalCount = data.count ?? 0;

      // If no results, try query variants (apostrophes, plurals)
      if (sorted.length === 0) {
        const variants = getQueryVariants(searchTerm);
        for (const variant of variants) {
          if (controller.signal.aborted) break;
          const variantUrl = buildSearchUrl(variant, region, 1);
          try {
            const vRes = await fetch(variantUrl, {
              signal: controller.signal,
              headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
            });
            if (vRes.ok) {
              const vData = await vRes.json();
              const vProducts: SearchProduct[] = (vData.products ?? []).map(normaliseHit);
              const vSorted = processResults(vProducts, variant);
              if (vSorted.length > 0) {
                sorted = vSorted;
                finalCount = vData.count ?? 0;
                break; // Use first variant that returns results
              }
            }
          } catch { /* skip failed variants */ }
        }
      }

      // Update results and loading in one batch — no flash of "no results"
      setResults(sorted);
      setTotalCount(finalCount);
      setHasMore(finalCount > PAGE_SIZE);
      setLoading(false);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('[FoodSearch] Search failed:', err?.message ?? err);
        // Final retry — try global endpoint as last resort
        try {
          await new Promise((r) => setTimeout(r, 1500));
          const fallbackUrl = buildSearchUrl(searchTerm, { ...region, subdomain: 'world' } as Region, 1);
          const retryRes = await fetch(fallbackUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const products: SearchProduct[] = (retryData.products ?? []).map(normaliseHit);
            const sorted = processResults(products, searchTerm);
            setResults(sorted);
            setTotalCount(retryData.count ?? 0);
            setHasMore((retryData.count ?? 0) > PAGE_SIZE);
            setLoading(false);
            return;
          }
        } catch (retryErr: any) {
          if (retryErr?.name === 'AbortError') return;
        }
        // All retries exhausted — show server error, not "no results"
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
        setServerError(true);
        setLoading(false);
      }
    }
  }

  /** Load next page of results and append to existing list */
  async function loadMore() {
    if (loadingMore || !hasMore) return;

    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    setLoadingMore(true);

    const region = regionRef.current;
    const searchTerm = currentTermRef.current;

    try {
      const url = buildSearchUrl(searchTerm, region, nextPage);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
      });

      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const products: SearchProduct[] = (data.products ?? []).map(normaliseHit);

      if (products.length === 0) {
        setHasMore(false);
        return;
      }

      const sorted = processResults(products, searchTerm);

      // Deduplicate against existing results
      setResults((prev) => {
        const existingCodes = new Set(prev.map((p) => p.code));
        const fresh = sorted.filter((p) => !existingCodes.has(p.code));
        return [...prev, ...fresh];
      });
      setHasMore(nextPage * PAGE_SIZE < (data.count ?? 0));
    } catch {
      // Silently handle load-more errors — user can retry
    } finally {
      setLoadingMore(false);
    }
  }

  // ── Navigate to scan-result & save to history ──────────────────────────────
  const openProduct = useCallback((product: SearchProduct) => {
    const productName = product.product_name ?? '';
    const brand = product.brands ?? '';
    const imageUrl = product.image_front_small_url ?? '';
    const barcode = product.code;
    const nutriscoreGrade = product.nutriscore_grade ?? '';

    router.push({
      pathname: '/scan-result',
      params: { scanId: '', productName, brand, imageUrl, barcode, nutriscoreGrade },
    });

    // Save to scan history in background (mirrors scanner.tsx pattern)
    if (session?.user?.id && barcode) {
      (async () => {
        const { data: existing } = await supabase
          .from('scans')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('barcode', barcode)
          .limit(1)
          .single();

        if (existing) {
          await supabase
            .from('scans')
            .update({
              scanned_at: new Date().toISOString(),
              product_name: productName,
              brand,
              image_url: imageUrl,
              nutriscore_grade: nutriscoreGrade,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('scans')
            .insert({
              user_id: session.user.id,
              barcode,
              product_name: productName,
              brand,
              image_url: imageUrl,
              nutriscore_grade: nutriscoreGrade,
              flagged_count: 0,
            });
        }
      })().catch((err) => console.error('Background search-scan save failed:', err));
    }
  }, [router, session]);

  // ── Render product row ──────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: SearchProduct }) => {
    const grade = item.nutriscore_grade?.toLowerCase();
    const gradeColor = grade ? NUTRISCORE_COLORS[grade] : null;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openProduct(item)} activeOpacity={0.75}>
        {item.image_front_small_url ? (
          <Image
            source={item.image_front_small_url}
            style={styles.productImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
            recyclingKey={item.code}
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <NoImagePlaceholder />
          </View>
        )}
        <View style={styles.cardContent}>
          {item.brands ? (
            <Text style={styles.brandName} numberOfLines={1}>{sentenceCase(item.brands)}</Text>
          ) : null}
          <Text style={styles.productName} numberOfLines={2}>
            {sentenceCase(item.product_name ?? '')}
          </Text>
        </View>
        {gradeColor ? (
          <View style={[styles.nutriscoreCircle, { backgroundColor: gradeColor }]}>
            <Text style={styles.nutriscoreText}>{grade!.toUpperCase()}</Text>
          </View>
        ) : null}
        <View style={styles.chevronBox}>
          <MenuChevronRightIcon color={Colors.secondary} size={14} />
        </View>
      </TouchableOpacity>
    );
  }, [openProduct]);

  const keyExtractor = useCallback((item: SearchProduct) => item.code, []);

  // ── Empty state ─────────────────────────────────────────────────────────────
  const ListEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <LottieLoader type="searching" fullScreen={false} size={100} message={t('search.searching')} />
        </View>
      );
    }
    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <ActionSearchIcon color="#aad4cd" size={48} />
          <Text style={styles.emptyText}>{t('search.prompt')}</Text>
        </View>
      );
    }
    return null; // noResults message shown in subtitle
  }, [loading, hasSearched, t]);

  // ── Load-more footer ───────────────────────────────────────────────────────
  const ListFooter = useCallback(() => {
    if (!hasSearched || results.length === 0) return null;
    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color={Colors.secondary} />
        </View>
      );
    }
    if (hasMore) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} activeOpacity={0.75}>
          <Text style={styles.loadMoreText}>{t('search.loadMore', { defaultValue: 'Load more results' })}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  }, [hasSearched, results.length, loadingMore, hasMore, t]);

  const ItemSeparator = useCallback(() => <View style={{ height: Spacing.xxs }} />, []);

  /** Clear search field and reset results */
  function clearSearch() {
    setQuery('');
    setResults([]);
    setTotalCount(0);
    setHasSearched(false);
    setSubmittedQuery('');
    setHasMore(false);
    inputRef.current?.focus();
  }

  function handleBack() {
    pageExit(() => safeBack());
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={{ flex: 1, opacity: pageOpacity, transform: [{ translateX: pageTranslateX }] }}>
      {/* ── Logo + menu header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/' as any)} activeOpacity={0.7} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Logo width={141} height={36} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={menuOpen ? closeMenu : openMenu}
          activeOpacity={0.8}
        >
          <Ionicons name={menuOpen ? 'close' : 'menu-outline'} size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Fixed header — stays outside FlatList so TextInput doesn't remount */}
      <View style={styles.headerContent}>
        {/* Back button */}
        <TouchableOpacity style={styles.backRow} onPress={handleBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{t('search.back')}</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>{t('search.title')}</Text>

        {/* Region dropdown */}
        <TouchableOpacity
          style={styles.regionDropdown}
          activeOpacity={0.85}
          onPress={() => setRegionPickerVisible(true)}
        >
          <RNImage source={FLAG_IMAGES[selectedRegion.code]} style={styles.flagImage} resizeMode="contain" />
          <Text style={styles.regionDropdownLabel} numberOfLines={1}>{selectedRegion.label}</Text>
          <ActionChevronDownIcon color={Colors.primary} size={20} />
        </TouchableOpacity>

        {/* Search input (Figma node 2976-2368) */}
        <View style={styles.searchInputContainer}>
          <ActionSearchIcon color={Colors.secondary} size={24} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#aad4cd"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              const trimmed = query.trim();
              if (trimmed.length >= 2) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                performSearch(trimmed, regionRef.current);
                Keyboard.dismiss();
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} activeOpacity={0.7} hitSlop={8}>
              <View style={styles.clearBtn}>
                <Text style={styles.clearBtnX}>✕</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results list */}
      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={hasSearched && !loading && results.length > 0 ? (
          <Text style={styles.subtitle}>
            {t('search.showing', { count: totalCount, term: submittedQuery })}
          </Text>
        ) : hasSearched && !loading && results.length === 0 && serverError ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Text style={styles.subtitle}>
              {t('search.serverBusy')}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: Colors.secondary, borderRadius: Radius.m, paddingVertical: 10, paddingHorizontal: 24 }}
              onPress={() => { if (submittedQuery) performSearch(submittedQuery, region); }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Figtree_700Bold' }}>
                {t('search.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : hasSearched && !loading && results.length === 0 ? (
          <Text style={styles.subtitle}>
            {t('search.noResults', { term: submittedQuery })}
          </Text>
        ) : null}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ItemSeparatorComponent={ItemSeparator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={() => { if (hasMore && !loadingMore) loadMore(); }}
        onEndReachedThreshold={0.4}
      />

      {/* Region picker modal */}
      <Modal
        visible={regionPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionPickerVisible(false)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setRegionPickerVisible(false)}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={25} tint="default" style={[StyleSheet.absoluteFill, styles.regionBackdrop]} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.regionBackdrop]} />
          )}
        </TouchableOpacity>

        <View style={styles.regionPanelWrapper} pointerEvents="box-none">
          <View style={styles.regionPanel}>
            <Text style={styles.regionPanelTitle}>{t('regionPicker.title')}</Text>

            <View style={styles.regionPanelContent}>
              {/* Selected region */}
              <TouchableOpacity
                style={styles.regionRow}
                activeOpacity={0.7}
                onPress={() => handleRegionSelect(selectedRegion)}
              >
                <RNImage source={FLAG_IMAGES[selectedRegion.code]} style={styles.flagImage} resizeMode="contain" />
                <Text style={styles.regionRowLabel}>{selectedRegion.label}</Text>
                <ActionCheckIcon color={Colors.accent} size={20} />
              </TouchableOpacity>

              <View style={styles.regionDivider} />

              {/* Other regions */}
              <View style={styles.regionOthersList}>
                {REGIONS.filter((r) => r.code !== selectedRegion.code).map((region) => (
                  <TouchableOpacity
                    key={region.code}
                    style={styles.regionRow}
                    activeOpacity={0.7}
                    onPress={() => handleRegionSelect(region)}
                  >
                    <RNImage source={FLAG_IMAGES[region.code]} style={styles.flagImage} resizeMode="contain" />
                    <Text style={styles.regionRowLabel}>{region.label}</Text>
                    {region.code !== 'gb' && !isPlus && <PlusTag />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
      </Animated.View>

      {/* Menu overlay — same pattern as (tabs)/_layout.tsx */}
      {menuVisible && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.menuOverlay, { opacity: menuAnim }]}>
          <MenuModal onClose={closeMenu} onNavigate={closeMenuInstant} />
          <View style={[styles.menuHeader, { paddingTop: insets.top + Spacing.m }]}>
            <Logo width={141} height={36} />
            <TouchableOpacity style={styles.menuBtn} onPress={closeMenu} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.m,
  },
  menuBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  listContent: {
    paddingHorizontal: Spacing.m,
  },
  headerContent: {
    paddingTop: Spacing.m,
    paddingBottom: Spacing.s,
    paddingHorizontal: Spacing.m,
    gap: Spacing.xs,
  },

  // Back button
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xxs,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 24,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.36,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },

  // Search input — matches Figma node 2976-2368
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
    padding: 0,
  },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnX: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 16,
  },

  // Product card (same as history)
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
    gap: Spacing.s,
    ...Shadows.level4,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
    lineHeight: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  nutriscoreCircle: {
    width: 24,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriscoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  chevronBox: {
    paddingLeft: 4,
  },

  // Empty / loading states
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.s,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Region dropdown
  regionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    height: 44,
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  regionDropdownLabel: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  flagImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },

  // Region picker modal
  regionBackdrop: {
    backgroundColor: 'rgba(217,217,217,0.5)',
  },
  regionPanelWrapper: {
    position: 'absolute',
    top: 160,
    left: Spacing.m,
  },
  regionPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 275,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.m,
    paddingHorizontal: Spacing.s,
    gap: Spacing.xs,
    ...Shadows.level4,
  },
  regionPanelTitle: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
  },
  regionPanelContent: {
    gap: Spacing.s,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regionRowLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  regionDivider: {
    height: 1,
    backgroundColor: '#aad4cd',
  },
  regionOthersList: {
    gap: 8,
  },

  // Load-more footer
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.m,
  },
  loadMoreBtn: {
    alignSelf: 'center',
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.xs,
    marginVertical: Spacing.s,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
    lineHeight: 17,
  },

  // Menu overlay
  menuOverlay: {
    backgroundColor: Colors.background,
    zIndex: 100,
  },
  menuHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
  },
});
