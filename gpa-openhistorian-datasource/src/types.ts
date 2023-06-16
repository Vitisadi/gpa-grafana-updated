import { DataQuery, DataSourceJsonData, DataSourceSettings } from '@grafana/data';

export interface MyQuery extends DataQuery {
  elements: string[];
  queryType: string;
  queryText: string;
  metadataOptions: {
    [tableName: string]: string[]
  };
  functionValues: {
    [label: string]: string[]
  }

  //Holders
  elementsList: string[];
  tablesList: string[];
  metadataList: {
    [tableName: string]: string[]
  }
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  elements: [],
  queryType: "Element List",
  queryText: "",

  //Holders
  elementsList: [],
  tablesList: [],
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  http: DataSourceSettings<any, any>;
  flags: {
    [key: string]: boolean;
  };
  // metadata: {
  //   [tableName: string]: {
  //     [columnName: string]: boolean;
  //   };
  // };
}
