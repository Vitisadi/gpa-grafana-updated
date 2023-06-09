import { DataQuery, DataSourceJsonData, DataSourceSettings } from '@grafana/data';

export interface MyQuery extends DataQuery {
  elements: string[];
  queryType: string;
  queryText: string;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  elements: [],
  queryType: "Element List",
  queryText: "",
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  http: DataSourceSettings<any, any>;
  flags: {
    [key: string]: boolean;
  };
  metadata: {
    [tableName: string]: {
      [columnName: string]: boolean;
    };
  };
}
