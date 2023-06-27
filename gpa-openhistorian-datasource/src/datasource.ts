import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from "@grafana/data";

import { MyQuery, MyDataSourceOptions, MetadataTarget, QueryRequest, Target } from "./types";
import { getBackendSrv } from "@grafana/runtime";
import _ from "lodash";
import { DefaultFlags } from "./js/constants";


export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url: string;
  flags: {
    [key: string]: boolean;
  };

  constructor(
    instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>
  ) {
    super(instanceSettings);

    this.url = instanceSettings.jsonData.http.url || "";
    this.flags = instanceSettings.jsonData.flags || {};
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
  async dataQuery(query: QueryRequest) {
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

  //Metadata of specific elements
  async metadatasQuery(targets: MetadataTarget[]) {
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/getmetadatas",
      data: targets,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  //Fetches valid tables 
  async tableOptionsQuery() {
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/gettableoptions",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  //Fetches a list of all metadata options from selected tables
  async metadataOptionsQuery(tables: string[]){
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/getmetadataoptions",
      data: { tables },
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  }

  //Fetches a list of all metadata options from selected tables
  async functionOptionsQuery(){
    return await getBackendSrv().datasourceRequest({
      url: this.url + "/getfunctions",
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
      //No Functions Selected
      if(target.functions.length === 0){
        return target.elements.join(";") 
      }

      //Build Functions
      let buildingQuery = ""
      target.functions.map((name, index)=>{
        buildingQuery += name + "("
        target.functionList[name].Parameters.map((parameter, index) => {
          if (parameter.ParameterTypeName === "data") {
            return;
          }
          buildingQuery += target.functionValues[name][index] + ","
        })
      })
      //Main Query
      buildingQuery += target.elements.join(";") 

      buildingQuery += ")".repeat(target.functions.length);
      
      return buildingQuery
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
    } else if (target.queryType === "Text Editor" && target.queryText) {
      return this.expressionToElements(target.queryText)
    } else {
      return [];
    }
  }

  expressionToElements(input: string) {
    // Find the last opening parenthesis
    const start = input.lastIndexOf("(");
    const end = input.indexOf(")", start);
    let targetElements = input;

    // Take text inside ()
    if (start !== -1 && end !== -1) {
      targetElements = input.slice(start + 1, end);
    }

    // Seperate expression from query
    const splitTargetElements = targetElements.split(",");
    const lastElement = splitTargetElements[splitTargetElements.length - 1].trim();

    // Seperate elements
    return lastElement.split(";");
  }
  




  buildQueryParameters(options: DataQueryRequest<MyQuery>): QueryRequest {
    const excludedFlags = this.calculateFlags();
    const excludeNormalFlags = this.flags["Normal"] ?? false;
  
    const targets: Target[] = options.targets.map((target) => ({
      refId: target.refId,
      target: this.targetToString(target),
      type: target.queryType ?? "Element List",
      metadataSelection: target.metadataOptions,
      excludedFlags: excludedFlags,
      excludeNormalFlags: excludeNormalFlags,
    }));
  
    return {
      panelId: options.panelId ??  0,
      dashboardId: options.dashboardId ?? 0,
      range: options.range!,
      rangeRaw: options.rangeRaw!,
      interval: options.interval ?? "",
      intervalMs: options.intervalMs ?? 0,
      format: "json",
      maxDataPoints: options.maxDataPoints ?? 0,
      targets: targets,
      adhocFilters: [], // Check what this is 
    };
  }

  buildMetadataParameters(
    options: DataQueryRequest<MyQuery>
  ): MetadataTarget[] {

    const targets: MetadataTarget[] = [];

    for (const target of options.targets) {
      const tables: string[] = Object.keys(target.metadataOptions || {});
      
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
    let query: QueryRequest = this.buildQueryParameters(options);

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
    console.log(metadataParsed)

    // Declare frames
    const frame = new MutableDataFrame({
      refId: target.refId,
      fields: [{ name: "Time", type: FieldType.time }],
    });

    //Add data & metadata fields 
    for (const entry of pointsData["data"]) {
      frame.addField({ name: entry["target"], type: FieldType.number });

      //Metadata fields
      for (const tableName in target.metadataOptions) {
        if (target.metadataOptions.hasOwnProperty(tableName)) {
          const metadataOptions = target.metadataOptions[tableName];
          for (const metadataName of metadataOptions) {
            const targetName = this.expressionToElements(entry["target"])[0]
            const val = metadataParsed[targetName][tableName][0][metadataName]
            frame.addField({ name: metadataName, values: [val] });
          }
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
