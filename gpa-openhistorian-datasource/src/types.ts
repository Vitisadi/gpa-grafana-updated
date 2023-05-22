import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  elements: string[];
  queryType: string;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  queryType: "element"
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
}
