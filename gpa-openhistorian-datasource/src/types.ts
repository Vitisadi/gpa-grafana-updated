import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  queryText?: string;
  constant: number;

  // queryTypes: Array<string>;
  // queryType: string;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  constant: 6.5,
  // queryTypes: [
  //     "Element List", "Filter Expression", "Text Editor"
  // ],
  // queryType: ("Element List"),
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
