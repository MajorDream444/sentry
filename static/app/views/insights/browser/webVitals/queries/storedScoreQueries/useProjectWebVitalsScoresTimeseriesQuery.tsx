import {getInterval} from 'sentry/components/charts/utils';
import type {SeriesDataUnit} from 'sentry/types/echarts';
import type {Tag} from 'sentry/types/group';
import type {MetaType} from 'sentry/utils/discover/eventView';
import EventView from 'sentry/utils/discover/eventView';
import type {DiscoverQueryProps} from 'sentry/utils/discover/genericDiscoverQuery';
import {useGenericDiscoverQuery} from 'sentry/utils/discover/genericDiscoverQuery';
import {DiscoverDatasets} from 'sentry/utils/discover/types';
import {MutableSearch} from 'sentry/utils/tokenizeSearch';
import {useLocation} from 'sentry/utils/useLocation';
import useOrganization from 'sentry/utils/useOrganization';
import usePageFilters from 'sentry/utils/usePageFilters';
import {DEFAULT_QUERY_FILTER} from 'sentry/views/insights/browser/webVitals/settings';
import type {BrowserType} from 'sentry/views/insights/browser/webVitals/utils/queryParameterDecoders/browserType';
import {SpanIndexedField} from 'sentry/views/insights/types';

type Props = {
  browserTypes?: BrowserType[];
  enabled?: boolean;
  tag?: Tag;
  transaction?: string | null;
  weighted?: boolean;
};

export type WebVitalsScoreBreakdown = {
  cls: SeriesDataUnit[];
  fcp: SeriesDataUnit[];
  inp: SeriesDataUnit[];
  lcp: SeriesDataUnit[];
  total: SeriesDataUnit[];
  ttfb: SeriesDataUnit[];
};

export type UnweightedWebVitalsScoreBreakdown = {
  unweightedCls: SeriesDataUnit[];
  unweightedFcp: SeriesDataUnit[];
  unweightedInp: SeriesDataUnit[];
  unweightedLcp: SeriesDataUnit[];
  unweightedTtfb: SeriesDataUnit[];
};

export const useProjectWebVitalsScoresTimeseriesQuery = ({
  transaction,
  tag,
  enabled = true,
  browserTypes,
}: Props) => {
  const pageFilters = usePageFilters();
  const location = useLocation();
  const organization = useOrganization();
  const search = new MutableSearch([
    'has:measurements.score.total',
    ...(tag ? [`${tag.key}:"${tag.name}"`] : []),
  ]);
  if (transaction) {
    search.addFilterValue('transaction', transaction);
  }
  if (browserTypes) {
    search.addDisjunctionFilterValues(SpanIndexedField.BROWSER_NAME, browserTypes);
  }
  const projectTimeSeriesEventView = EventView.fromNewQueryWithPageFilters(
    {
      yAxis: [
        'weighted_performance_score(measurements.score.lcp)',
        'weighted_performance_score(measurements.score.fcp)',
        'weighted_performance_score(measurements.score.cls)',
        'weighted_performance_score(measurements.score.inp)',
        'weighted_performance_score(measurements.score.ttfb)',
        'performance_score(measurements.score.lcp)',
        'performance_score(measurements.score.fcp)',
        'performance_score(measurements.score.cls)',
        'performance_score(measurements.score.inp)',
        'performance_score(measurements.score.ttfb)',
        'count()',
      ],
      name: 'Web Vitals',
      query: [DEFAULT_QUERY_FILTER, search.formatString()].join(' ').trim(),
      version: 2,
      fields: [],
      interval: getInterval(pageFilters.selection.datetime, 'low'),
      dataset: DiscoverDatasets.METRICS,
    },
    pageFilters.selection
  );

  const result = useGenericDiscoverQuery<
    {
      data: any[];
      meta: MetaType;
    },
    DiscoverQueryProps
  >({
    route: 'events-stats',
    eventView: projectTimeSeriesEventView,
    location,
    orgSlug: organization.slug,
    getRequestPayload: () => ({
      ...projectTimeSeriesEventView.getEventsAPIPayload(location),
      yAxis: projectTimeSeriesEventView.yAxis,
      topEvents: projectTimeSeriesEventView.topEvents,
      excludeOther: 0,
      partial: 1,
      orderby: undefined,
      interval: projectTimeSeriesEventView.interval,
    }),
    options: {
      enabled: pageFilters.isReady && enabled,
      refetchOnWindowFocus: false,
    },
    referrer: 'api.performance.browser.web-vitals.timeseries-scores',
  });

  const data: WebVitalsScoreBreakdown & UnweightedWebVitalsScoreBreakdown = {
    lcp: [],
    fcp: [],
    cls: [],
    ttfb: [],
    inp: [],
    total: [],
    unweightedCls: [],
    unweightedFcp: [],
    unweightedInp: [],
    unweightedLcp: [],
    unweightedTtfb: [],
  };

  result?.data?.['weighted_performance_score(measurements.score.lcp)']?.data.forEach(
    (interval, index) => {
      // Weighted data
      ['lcp', 'fcp', 'cls', 'ttfb', 'inp'].forEach(webVital => {
        data[webVital].push({
          value:
            result?.data?.[`weighted_performance_score(measurements.score.${webVital})`]
              ?.data[index][1][0].count * 100 ?? 0,
          name: interval[0] * 1000,
        });
      });
      // Unweighted data
      ['lcp', 'fcp', 'cls', 'ttfb', 'inp'].forEach(webVital => {
        // Capitalize first letter of webVital
        const capitalizedWebVital = webVital.charAt(0).toUpperCase() + webVital.slice(1);
        data[`unweighted${capitalizedWebVital}`].push({
          value:
            result?.data?.[`performance_score(measurements.score.${webVital})`]?.data[
              index
            ][1][0].count * 100 ?? 0,
          name: interval[0] * 1000,
        });
      });
    }
  );

  return {data, isLoading: result.isLoading};
};
