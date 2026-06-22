import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { theme } from '../theme';
import { getDailyQuote } from '../services/quotesApi';
import type { Quote } from '../services/quotesApi';

const FALLBACK_QUOTE: Quote = {
  id: 'fallback',
  content: '路虽远，行则将至；事虽难，做则必成。',
  author: '荀子',
  source: '《荀子·修身》',
};

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateStr: string): string {
  const today = formatLocalDate(new Date());
  if (dateStr === today) return '今天';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === formatLocalDate(yesterday)) return '昨天';

  const [year, month, day] = dateStr.split('-');
  return `${parseInt(month, 10)}月${parseInt(day, 10)}日`;
}

function getLast7Days(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return formatLocalDate(d);
  });
}

export function DailyQuote() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const pageWidth = screenWidth;
  const days = getLast7Days();
  const todayIndex = days.length - 1;
  const scrollViewRef = useRef<ScrollView>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(todayIndex);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // 初始加载完成或屏幕旋转导致宽度变化后，滚动到当前页
  useEffect(() => {
    if (loading) return;
    scrollViewRef.current?.scrollTo({
      x: activeIndexRef.current * pageWidth,
      animated: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pageWidth]);

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      days.map(async (date) => {
        try {
          const quote = await getDailyQuote(date);
          return { date, quote };
        } catch {
          return { date, quote: FALLBACK_QUOTE };
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, Quote> = {};
        results.forEach(({ date, quote }) => {
          map[date] = quote;
        });
        setQuotes(map);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / pageWidth);
    setActiveIndex(Math.max(0, Math.min(index, days.length - 1)));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {days.map((date) => {
          const quote = quotes[date] || FALLBACK_QUOTE;
          const isFallback = quote.id === FALLBACK_QUOTE.id;
          return (
            <View key={date} style={[styles.page, { width: pageWidth }]}>
              <View style={styles.container}>
                <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>
                <Text style={styles.quoteIcon}>"</Text>
                <Text style={styles.content}>{quote.content}</Text>
                {(quote.author || quote.source) && (
                  <Text style={styles.meta}>
                    {quote.author && `—— ${quote.author}`}
                    {quote.source && ` ${quote.source}`}
                  </Text>
                )}
                {isFallback && (
                  <Text style={styles.fallbackHint}>名言库暂未配置，显示默认内容</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.indicatorContainer}>
        {days.map((_, index) => (
          <View
            key={index}
            style={[styles.indicator, index === activeIndex && styles.indicatorActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  scrollContent: {},
  page: {
    paddingHorizontal: theme.spacing.md,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  dateLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.sm,
  },
  quoteIcon: {
    fontSize: 32,
    lineHeight: 32,
    color: theme.colors.primaryLight,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.md,
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    textAlign: 'right',
  },
  fallbackHint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textLight,
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: theme.colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
