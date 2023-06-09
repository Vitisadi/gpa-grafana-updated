import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  QueryResultMeta,
} from "@grafana/data";

import { MyQuery, MyDataSourceOptions } from "./types";
import { getBackendSrv } from "@grafana/runtime";
import _ from "lodash";
import { DefaultFlags } from "./js/constants";

interface FieldMeta {
  [key: string]: {
    [fieldname: string]: string[];
  };
}

interface CustomQueryResultMeta extends QueryResultMeta {
  fields: {
    [fieldName: string]: FieldMeta;
  };
}

interface MetadataTarget {
  target: string;
  tables: string[];
}

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url: string;
  flags: {
    [key: string]: boolean;
  };
  metadata: {
    [tableName: string]: {
      [columnName: string]: boolean;
    };
  };

  constructor(
    instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>
  ) {
    super(instanceSettings);

    this.url = instanceSettings.jsonData.http.url || "";
    this.flags = instanceSettings.jsonData.flags || {};
    this.metadata = instanceSettings.jsonData.metadata || {};
  }

  //List of all elements
  async searchQuery() {
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/search",
      method: "POST",
      data: { target: "" },
    });
  }

  //Information on specific elements
  async dataQuery(query: DataQueryRequest<MyQuery>) {
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/query",
      data: query,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  //Metadata of specific elements
  async metadataQuery(target: MetadataTarget) {
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/getmetadata",
      data: target,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  // Metadata of specific elements
  async metadatasQuery(targets: MetadataTarget[]) {
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/getmetadatas",
      data: targets,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

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

  targetToString(target: MyQuery) {
    if (target === undefined || target.elements === undefined) {
      return "";
    }

    if (!target.queryType || target.queryType === "Element List") {
      return target.elements.join(";");
    }
    else if(target.queryType === "Text Editor"){
      return target.queryText
    }

    else{
      return ""
    }
  }

  targetToList(target: MyQuery) {
    if (target === undefined || target.elements === undefined) {
      return [];
    }


    if (!target.queryType || target.queryType === "Element List") {
      return target.elements;
    }
    else if(target.queryType === "Text Editor" && target.queryText){
      return target.queryText.split(";")
    }

    else{
      return []
    }

    
  }


  buildQueryParameters(options: DataQueryRequest<MyQuery>) {
    const excludedFlags = this.calculateFlags();
    const excludeNormalFlags = this.flags["Normal"]
      ? this.flags["Normal"]
      : false;

    const targets = options.targets.map((target) => ({
      target: this.targetToString(target),
      refId: target.refId,
      hide: target.hide,
      excludedFlags: excludedFlags,
      excludeNormalFlags: excludeNormalFlags,
      queryOptions: {
        excludedFlags: excludedFlags,
        excludeNormalFlags: excludeNormalFlags,
      },
      queryType: target.queryType ? target.queryType : "Element List",
      elements: target.elements,
      queryText: target.queryText,
    }));

    options.targets = targets;

    return options;
  }

  buildMetadataParameters(
    options: DataQueryRequest<MyQuery>
  ): MetadataTarget[] {

    const targets: MetadataTarget[] = [];
    const tables: string[] = Object.keys(this.metadata);

    for (const target of options.targets) {
      const elements = this.targetToList(target)
      if (!elements) {
        continue;
      }

      for (const element of elements) {
        targets.push({
          target: element,
          tables: tables,
        });
      }
    }

    return targets;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    const selectedMetadataOptions: { [key: string]: string[] } = {};

    Object.entries(this.metadata).forEach(([tableName, columns]) => {
      const metadataNames = Object.entries(columns)
        .filter(([columnName, value]) => value === true && columnName !== "Select All")
        .map(([columnName]) => columnName);

      if (metadataNames.length > 0) {
        selectedMetadataOptions[tableName] = metadataNames;
      }
    });


    const target = options.targets[0];
    const blankQuery = {
      data: [
        new MutableDataFrame({
          refId: target.refId,
          fields: [
            { name: "Time", values: [from, to], type: FieldType.time },
          ],
        }),
      ],
    };

    if (!target.elements) {
      return blankQuery
    }

    //Generate query
    let query = this.buildQueryParameters(options);

    // Remove all hidden elements
    query.targets = query.targets.filter(function (t) {
      return !t.hide;
    });

    // Get Data
    let pointsData
    let metadataParameters
    try{
      pointsData = await this.dataQuery(query);
      metadataParameters = this.buildMetadataParameters(options);
    }
    catch(error) {
      console.log(error)
      return blankQuery
    }
    



    const metadataResponse = await this.metadatasQuery(metadataParameters);
    let metadataParsed = JSON.parse(metadataResponse.data);

    // Declare frames
    const frame = new MutableDataFrame({
      refId: target.refId,
      fields: [{ name: "Time", type: FieldType.time }],
      meta: {
        fields: {},
      } as CustomQueryResultMeta, // Use the custom interface
    });

    const metadata = frame.meta as CustomQueryResultMeta;
    const fieldMetadata = metadata.fields;

    // Add fields & meta data
    for (const entry of pointsData["data"]) {
      frame.addField({ name: entry["target"], type: FieldType.number });

      // Initialize metadata for current field
      fieldMetadata[entry["target"]] = {};

      //Populate selected metadata options
      for (const tableName in selectedMetadataOptions) {
        if (!selectedMetadataOptions.hasOwnProperty(tableName)) {
          continue;
        }
        fieldMetadata[entry["target"]][tableName] = {};
        const metadataOptions = selectedMetadataOptions[tableName];
        for (const metadataOption of metadataOptions) {
          fieldMetadata[entry["target"]][tableName][metadataOption] = metadataParsed[entry["target"]][tableName][0][metadataOption];
        }
      }        
    }

    // Intermediate object to group points by timestamp
    const groupedPoints: {
      [timestamp: number]: { [target: string]: number };
    } = groupPoints(pointsData);

    // Iterate through grouped points and add them to the frame
    for (const timestamp in groupedPoints) {
      const data: { [key: string]: any } = { Time: parseInt(timestamp, 10) };
      Object.assign(data, groupedPoints[timestamp]);
      frame.add(data);
    }


    return { data: [frame] };
  }

  async testDatasource() {
    return await getBackendSrv()
      .datasourceRequest({
        url: this.url + "/",
        method: "GET",
      })
      .then(function (response) {
        if (response.status === 200) {
          return {
            status: "success",
            message: "Data source is working",
            title: "Success",
          };
        } else {
          return {
            status: "error",
            message: "Data source is not working",
            title: "Error",
          };
        }
      });
  }
}

//Groups data by time
function groupPoints(pointsData: { [key: string]: any }) {
  const groupedPoints: { [timestamp: number]: { [target: string]: number } } =
    {};

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
