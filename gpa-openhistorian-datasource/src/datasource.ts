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
import { DefaultFlags } from './js/constants'

interface FieldMeta {
  [key: string]: number | undefined;
}

interface CustomQueryResultMeta extends QueryResultMeta {
  fields: {
    [fieldName: string]: FieldMeta;
  };
}

interface MetadataTarget {
  refId: string;
  target: string;
  type: string;
  excludedFlags: number;
  excludeNormalFlags: boolean;
}


export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url: string;
  flags: {
    [key: string]: boolean;
  };
  metadata: {
    [key: string]: boolean;
  };

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.jsonData.http.url || "";
    this.flags = instanceSettings.jsonData.flags || {};
    this.metadata = instanceSettings.jsonData.metadata || {};
     
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

  //Metadata of specific elements
  async metadataQuery(target: MetadataTarget){
    return await getBackendSrv().datasourceRequest({
      url: this.url + '/getmetadata',
      data: target,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Metadata of specific elements
  async metadatasQuery(targets: MetadataTarget[]){
    return await getBackendSrv().datasourceRequest({
      url: this.url + '/getmetadatas',
      data: targets,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }



  //Information on specific elements
  // async metadataOptionsQuery() {
  // const response = await getBackendSrv().datasourceRequest({
  //   url: this.url + '/getmetadataoptions',
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' }
  // });
  // return response.data;
  // }


  //Generate value of excluded flags
  calculateFlags() {
    let excludedValue = 0;

    for (const [key, value] of Object.entries(this.flags)) {
      if (key !== "Select All" && key !== "Normal" && value === true) {
        excludedValue ^= DefaultFlags[key as keyof typeof DefaultFlags].Flag;
      }
    }

    return excludedValue;
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
    const excludedFlags = _this.calculateFlags()
    const excludeNormalFlags = _this.flags["Normal"] ? _this.flags["Normal"] : false

    let targets = _.map(options.targets, function (target) {
      return {
        target: _this.fixTemplates(target),
        refId: target.refId,
        hide: target.hide, 
        excludedFlags: excludedFlags,
        excludeNormalFlags: excludeNormalFlags,
        queryOptions: {
          excludedFlags: excludedFlags,
          excludeNormalFlags:excludeNormalFlags,
        },
        queryType: target.queryType ? target.queryType : "Element List",
        elements: target.elements,
      };
    });
    

    options.targets = targets;

    return options;
  }

  buildMetadataParameters(options: DataQueryRequest<MyQuery>): MetadataTarget[] {
    let _this = this; 
    const excludedFlags = _this.calculateFlags()
    const excludeNormalFlags = _this.flags["Normal"] ? _this.flags["Normal"] : false
  
    const targets: MetadataTarget[] = [];
  
    options.targets.forEach(function (target) {
      for(const element of target.elements){
        targets.push({
          refId: target.refId,
          target: element,
          type: "table", 
          excludedFlags: excludedFlags,
          excludeNormalFlags: excludeNormalFlags
        });
      }
    });
  
    return targets;
  }


  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    //Filter metadata options to include only those that are selected (true)
    const selectedMetadataOptions = Object.keys(this.metadata).filter(
      key => this.metadata[key] === true && key !== "Select All"
    );

    //Return a constant for each query.
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

        //Get Data
        const pointsData = await this.dataQuery(query)

        let metadataParameters = this.buildMetadataParameters(options);
        const metadataResponse = await this.metadatasQuery(metadataParameters)
        let metadataParsed = JSON.parse(metadataResponse.data);

        
        //Declare frames
        const frame = new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: 'Time', type: FieldType.time },
          ],
          meta: {
            fields: {},
          } as CustomQueryResultMeta, // Use the custom interface
        });

        const metadata = frame.meta as CustomQueryResultMeta;
        const fieldMetadata = metadata.fields;

        //Add fields & meta data
        for (const entry of pointsData["data"]) {
          frame.addField({ name: entry["target"], type: FieldType.number })
          //const entryMeta = entry["meta"]["custom"];
    
          //Initialize metadata for current field
          fieldMetadata[entry["target"]] = {};

          //Populate selected metadata options
          for (const metadataOption of selectedMetadataOptions) {
            fieldMetadata[entry["target"]][metadataOption] = metadataParsed[entry["target"]][0][metadataOption]
          }
        }
        
        console.log("Meta Data")
        console.log(metadata)

        //Intermediate object to group points by timestamp
        const groupedPoints: { [timestamp: number]: { [target: string]: number; }; } = groupPoints(pointsData);

        //Iterate through grouped points and add them to the frame
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

