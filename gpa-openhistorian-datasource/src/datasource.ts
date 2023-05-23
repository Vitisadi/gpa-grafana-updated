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
import _ from 'lodash';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  path: string;
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    this.path = instanceSettings.jsonData.path || "";
  }

  fixTemplates(target: MyQuery) {
    if (target === undefined){
      return '';
    } 

    let sep = ' ';
    if(!target.queryType || target.queryType === 'Element List'){
      sep = ';'
    }

    return target.elements.join(sep);
  }

  buildQueryParameters(options: DataQueryRequest<MyQuery>) {
      let _this = this; 

      let targets = _.map(options.targets, function (target) {
          return {
          target: _this.fixTemplates(target),
          refId: target.refId,
          hide: target.hide, 
          excludedFlags: 0,
          excludeNormalFlags: false,
          queryType: target.queryType,
          elements: target.elements,
          queryOptions: target.queryOptions
          };
      });
      // options.targets = 
      options.targets = targets;

      return options;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Return a constant for each query.
    const dataPromises = options.targets.map(async (target) => { 
      //Undefined or element
      if(!target.queryType || target.queryType === 'Element List'){
        let query = this.buildQueryParameters(options);

        //Remove all hidden elements
        query.targets = query.targets.filter(function (t) {
          return !t.hide;
        });

        const pointsData = await getBackendSrv().datasourceRequest({
          url: this.path + '/query',
          data: query,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        const frame = new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'time', type: FieldType.time },
          ],
        });

        //Add fields
        for (const entry of pointsData["data"]) {
          frame.addField({ name: entry["target"], type: FieldType.number })
        }

        //Intermediate object to group points by timestamp
        const groupedPoints: { [timestamp: number]: { [target: string]: number; }; } = groupPoints(pointsData);

        // Iterate through grouped points and add them to the frame
        for (const timestamp in groupedPoints) {
          const data: { [key: string]: any } = { time: parseInt(timestamp, 10) };
          Object.assign(data, groupedPoints[timestamp]);
          frame.add(data);
        }

        return frame
      }
      // else if(target.queryType === 'filter'){

      // }
      // else if(target.queryType === 'text'){

      // }
      else{
        // return new MutableDataFrame({
        //   refId: target.refId,
        //   fields: [
        //     { name: 'Time', values: [from, to], type: FieldType.time },
        //     //{ name: 'Value', values: [target.constant, target.constant], type: FieldType.number },
        //   ],
        // });
      }
      return new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Time', values: [from, to], type: FieldType.time },
            //{ name: 'Value', values: [target.constant, target.constant], type: FieldType.number },
          ],
        });
    });

    const data = await Promise.all(dataPromises);


    return { data };
  }

  async testDatasource() {
    return await getBackendSrv().datasourceRequest({
        url: this.path + '/',
        method: 'GET'
      }).then(function (response) {
        if (response.status === 200) {
          return { status: "success", message: "Data source is working", title: "Success" };
        }
        else {
          return { status: "error", message: "Data source is not working", title: "Error" };
        }
      }
    );
  }
}
function groupPoints(pointsData: { [key: string]: any }) {
  const groupedPoints: { [timestamp: number]: { [target: string]: number; }; } = {};

  //Iterate through each entry
  for (const entry of pointsData["data"]) {
    for (const points of entry["datapoints"]) {
      const [val, timestamp] = points;

      //Check if timestamp already exists in groupedPoints
      if (timestamp in groupedPoints) {
        groupedPoints[timestamp][entry["target"]] = val;
      } else {
        groupedPoints[timestamp] = { [entry["target"]]: val };
      }
    }
  }
  return groupedPoints;
}

