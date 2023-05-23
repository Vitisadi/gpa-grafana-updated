import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  elements: string[];
  queryType: string;
  queryOptions: {
    excludedDataFlags: number;
    excludeNormalData: boolean;
    updateAlarms: boolean;
  }
  
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  queryType: "Element List",
  queryOptions: {
    excludedDataFlags: 0,
    excludeNormalData: false,
    updateAlarms: false,
  }
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  url: string;
}
