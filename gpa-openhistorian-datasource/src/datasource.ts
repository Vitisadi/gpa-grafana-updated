import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';
import { getBackendSrv } from '@grafana/runtime';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  path: string;
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    this.path = instanceSettings.jsonData.path || "";
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Return a constant for each query.
    const data = options.targets.map((target) => {
      return new MutableDataFrame({
        refId: target.refId,
        fields: [
          { name: 'Time', values: [from, to], type: FieldType.time },
          //{ name: 'Value', values: [target.constant, target.constant], type: FieldType.number },
        ],
      });
    });

    return { data };
  }

  async testDatasource() {
    await getBackendSrv().datasourceRequest({
      url: "https://openhistorian.demo.gridprotectionalliance.org/api/grafana/",
      method: 'GET'
    }).then(function (response) {
        console.log("status")
        console.log(response)
        if (response["status"] === 200) {
          return { status: "success", message: "Data source is working", title: "Success!" };
        }
        else {
          return { status: "error", message: "Data source is not working", title: "Error" };
        }
     });
  

    // return {
    //     status: 'success',
    //     message: 'Success',
    //   };


  }
}
