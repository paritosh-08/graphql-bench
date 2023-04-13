import type * as stream from 'stream'

import type Histogram from 'hdr-histogram-js/src/Histogram'
import type { HistogramSummary } from 'hdr-histogram-js/src/Histogram'
import * as precise_hdr from '../../PreciseHdrHistogram'

import type { K6Options } from '../k6/types'
import type { Stage as K6Stage } from 'k6/options'
import type { Options as AutocannonOptions } from 'autocannon'

/**
 * ========================
 * MAIN TYPES
 * ========================
 */

/**
 * The type of the query benchmark test being run
 */
export type ExecutionStrategy =
  | 'REQUESTS_PER_SECOND'
  | 'FIXED_REQUEST_NUMBER'
  | 'MAX_REQUESTS_IN_DURATION'
  | 'MULTI_STAGE'
  | 'CUSTOM'

/**
 * The mode for executing the queries
 * ASYNC: Run all queries in parallel
 * SYNC: Run all queries in sequence
 */
export type ExecutionMode =
  | 'ASYNC'
  | 'SYNC'

/**
 * Shared configuration between all benchmark runs
 */
export interface GlobalConfig {
  url: string
  /** When true assume the target is a hasura instance and run some additional checks */
  extended_hasura_checks?: boolean
  headers?: Record<string, any>
  queries: Benchmark[]
  /** When true, will log all HTTP responses */
  debug?: boolean
  /**
   * Optional writable stream, can be used to stream results from process to HTML responses
   * @example
   * app.get('/path', (req, res) => {
   *   var child = spawn('ls', ['-al'])
   *   child.stdout.pipe(res)
   * })
   */
  writeStream?: stream.Writable
  execution_mode?: ExecutionMode
}

export enum BenchmarkTool {
  AUTOCANNON = 'autocannon',
  K6 = 'k6',
  WRK2 = 'wrk2',
}

/**
 * Unused base class with shared attributes that specific types of benchmark configs extend
 */
interface _BenchmarkRunConfig {
  name: string
  tools: BenchmarkTool[]
  execution_strategy: ExecutionStrategy
  query: string
  variables?: Record<string, any>
  connections?: number
}

/**
 * Config for a benchmark with requests per second for a duration
 */
export interface RequestsPerSecondBenchmark extends _BenchmarkRunConfig {
  execution_strategy: 'REQUESTS_PER_SECOND'
  rps: number
  duration: string
}

/**
 * Config for a benchmark that makes a fixed number of requests with no other constraints
 */
export interface FixedRequestNumberBenchmark extends _BenchmarkRunConfig {
  execution_strategy: 'FIXED_REQUEST_NUMBER'
  requests: number
}

/**
 * Config for a benchmark that makes the maximum number of requests in a duration
 */
export interface MaxRequestsInDurationBenchmark extends _BenchmarkRunConfig {
  execution_strategy: 'MAX_REQUESTS_IN_DURATION'
  duration: string
}

/**
 * Config for a benchmark with multiple stages of requests per seconds and durations
 */
export interface MultiStageBenchmark extends _BenchmarkRunConfig {
  execution_strategy: 'MULTI_STAGE'
  initial_rps: number
  stages: K6Stage[]
}

/**
 * Config for a benchmark with fully custom attributes
 */
export interface CustomBenchmark extends _BenchmarkRunConfig {
  execution_strategy: 'CUSTOM'
  options: {
    k6?: K6Options
    autocannon?: AutocannonOptions
  }
}

/**
 * Supertype that represents the union of all possible benchmark configs
 */
export type Benchmark =
  | RequestsPerSecondBenchmark
  | FixedRequestNumberBenchmark
  | MaxRequestsInDurationBenchmark
  | MultiStageBenchmark
  | CustomBenchmark

/**
 * ========================
 * UTILITY TYPES
 * ========================
 */

// see 'parseHdrHistogramText()'
export interface HDRHistogramParsedStats {
  value: string
  percentile: string
  totalCount: string
  ofOnePercentile: string
}

// add some extra statistics:
export interface HistogramSummaryWithEtc extends HistogramSummary {
  mean: number
  geoMean?: number
  // The medians/geomeans for different sized prefixes of the samples, letting
  // us validate the results / get a sense if performance skewed over time
  p501stHalf?: number
  p501stQuarter?: number
  p501stEighth?: number
  geoMean1stHalf?: number
  geoMean1stQuarter?: number
  geoMean1stEighth?: number
  min: number
  stdDeviation: number
}

export interface BenchmarkMetrics {
  name: string
  time: {
    start: string | Date
    end: string | Date
  }
  requests: {
    count: number
    average: number
  }
  response: {
    totalBytes: number
    bytesPerSecond: number
  }
  histogram: {
    json: HistogramSummaryWithEtc
    parsedStats: HDRHistogramParsedStats[]
  }
  // A basic histogram with equal size buckets (the hdr histogram above predates this).
  // (In fact this is 2 histograms: one for the entire set of data, and another
  // count for just the first half of the data)
  basicHistogram?: BasicHistogram
  // These are available when 'extended_hasura_checks: true' in the config yaml:
  extended_hasura_checks?: {
    bytes_allocated_per_request: number
    // memory residency stats, both before and after the benchmark runs:
    //   see: https://hackage.haskell.org/package/base-4.15.0.0/docs/GHC-Stats.html
    live_bytes_before: number
    live_bytes_after: number
    mem_in_use_bytes_before: number
    mem_in_use_bytes_after: number
  }
}

export interface BenchmarkMetricParams {
  name: string
  histogram: precise_hdr.PreciseHdrHistogram
  basicHistogram?: BasicHistogram
  time: {
    start: Date | string
    end: Date | string
  }
  requests: {
    count: number
    average: number
  }
  response: {
    totalBytes: number
    bytesPerSecond: number
  },
  // geometric mean of service times
  geoMean?: number
  // The medians/geomeans for different sized prefixes of the samples, letting
  // us validate the results / get a sense if performance skewed over time
  p501stHalf?: number
  p501stQuarter?: number
  p501stEighth?: number
  geoMean1stHalf?: number
  geoMean1stQuarter?: number
  geoMean1stEighth?: number
}

// See histogram()
//
// There are 'count' values in the bucket greater than 'gte'. 'count1stHalf'
// is the bucket count just looking at the first half of the data (this might
// help us determine whether the results skew over the course of the benchmark
// run)
export interface HistBucket {
    gte: number
    count: number
    count1stHalf: number
}
export interface BasicHistogram {
    buckets: HistBucket[]
    outliersRemoved: number
}
