import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  QueryResultMeta,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';
import { getBackendSrv } from '@grafana/runtime';
import _ from 'lodash';

interface CustomQueryResultMeta extends QueryResultMeta {
  fields: {
    [fieldName: string]: {
      latitude?: number;
      longitude?: number;
      // Add any other metadata properties as needed
    };
  };
}


export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url: string;
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    console.log(instanceSettings)
    this.url = instanceSettings.jsonData.http.url || "";
  }

  //List of all elements
  async searchQuery(){
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/search",
      method: 'POST',
      data: { target: "" }
    });
  }

  //Information on specific elements
  async dataQuery(query: DataQueryRequest<MyQuery>){
    return await getBackendSrv().datasourceRequest({
      url: this.url + '/query',
      data: query,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
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
      if(!target.elements){
        return new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Time', values: [from, to], type: FieldType.time },
          ],
        });
      }

      //Undefined or element
      if(!target.queryType || target.queryType === 'Element List'){
        let query = this.buildQueryParameters(options);

        //Remove all hidden elements
        query.targets = query.targets.filter(function (t) {
          return !t.hide;
        });

        const pointsData = await this.dataQuery(query)
        
        //Declare frames
        const frame = new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Time', type: FieldType.time },
          ],
          meta: {
            fields: {
              time: {}, 
            },
          } as CustomQueryResultMeta, // Use the custom interface
        });

        const metadata = frame.meta as CustomQueryResultMeta;
        const fieldMetadata = metadata.fields;

        //Initialize the field metadata        
        // fieldMetadata.time.latitude = 35.043621;
        // fieldMetadata.time.longitude = -85.308990;

        // console.log(fieldMetadata.time.latitude);
        // console.log(fieldMetadata.time.longitude);


        
        //Add fields & meta data
        for (const entry of pointsData["data"]) {
          frame.addField({ name: entry["target"], type: FieldType.number })
          fieldMetadata[entry["target"]] = {
            latitude: 35.043621,
            longitude: -85.308990
          }
        }

        
        //console.log(fieldMetadata)
        

        //Intermediate object to group points by timestamp
        const groupedPoints: { [timestamp: number]: { [target: string]: number; }; } = groupPoints(pointsData);

        // Iterate through grouped points and add them to the frame
        for (const timestamp in groupedPoints) {
          const data: { [key: string]: any } = { Time: parseInt(timestamp, 10) };
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
          ],
        });
    });

    const data = await Promise.all(dataPromises);


    return { data };
  }

  async testDatasource() {
    return await getBackendSrv().datasourceRequest({
        url: this.url + '/',
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

//Groups data by time
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

