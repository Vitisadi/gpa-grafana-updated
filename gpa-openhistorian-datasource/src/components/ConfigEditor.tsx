import {
  DataSourceHttpSettings,
  InlineFieldRow,
  InlineField,
  Switch,
  Tooltip,
  AsyncMultiSelect,
} from "@grafana/ui";

import React, { useState, useCallback } from "react";
import { DataSourcePluginOptionsEditorProps, DataSourceSettings, SelectableValue } from "@grafana/data";
import { MyDataSourceOptions } from "../types";
import { DefaultFlags } from "../js/constants";
import { getBackendSrv } from "@grafana/runtime";
import "../css/config-editor.css";

interface Props
  extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;
  const [metadataOptions, setMetadataOptions] = useState<
    Array<{ label: string; options: Array<{ label: string }> }>
  >([]);  
  const [tableOptions, setTableOptions] = useState<Array<SelectableValue<string>>>();

  const onHttpChange = (config: DataSourceSettings<MyDataSourceOptions>) => {
    const jsonData = {
      ...options.jsonData,
      flags: options.jsonData.flags || {},
      http: config,
    };

    onOptionsChange({ ...options, jsonData });
  };



  const onFlagsChange = (event: React.FormEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const { name, checked } = input;
  
    let updatedFlags: { [key: string]: boolean } = {};
  
    // Select All
    if (name === "Select All") {
      const selectAllState = !options.jsonData.flags || !options.jsonData.flags["Select All"];
  
      // Set all flags to the selectAllState
      updatedFlags = Object.keys(DefaultFlags).reduce((acc: { [key: string]: boolean }, flag) => {
        acc[flag] = selectAllState;
        return acc;
      }, {} as { [key: string]: boolean });
    } else {
      // If individual flag is toggled, update its value
      updatedFlags = {
        ...options.jsonData.flags,
        [name]: checked,
      };
  
      // If any individual flag is unchecked, uncheck the "Select All" flag
      if (!checked) {
        updatedFlags["Select All"] = false;
      }
    }
  
    const jsonData = {
      ...options.jsonData,
      flags: updatedFlags,
    };
  
    onOptionsChange({ ...options, jsonData });
  };

  const onMetaChange = (tableLabel: string) => (event: React.FormEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const { name, checked } = input;
  
    let updatedMetaData: { [key: string]: boolean } = {};
  
    // Select All
    if (name === "Select All") {
      const selectAllState = !options.jsonData.metadata[tableLabel] || !options.jsonData.metadata[tableLabel]["Select All"];
  
      console.log(metadataOptions)
      // Set all metadata flags for the table to the selectAllState
      updatedMetaData = metadataOptions.reduce((acc: { [key: string]: boolean }, option) => {
        option.options.forEach((flagOption) => {
          acc[flagOption.label] = selectAllState;
        });
        return acc;
      }, { ...options.jsonData.metadata[tableLabel] });
            
    } else {
      // If individual metadata flag is toggled, update its value
      updatedMetaData = {
        ...options.jsonData.metadata[tableLabel],
        [name]: checked,
      };
  
      // If any individual metadata flag is unchecked, uncheck the "Select All" flag
      if (!checked) {
        updatedMetaData["Select All"] = false;
      }
    }
  
    const updatedMetadata = {
      ...options.jsonData.metadata,
      [tableLabel]: updatedMetaData,
    };
  
    const jsonData = {
      ...options.jsonData,
      metadata: updatedMetadata,
    };
  
    onOptionsChange({ ...options, jsonData });
  };

  const onTableChange = (selected: Array<SelectableValue<string>>) => {
    setTableOptions(selected);
  
    const tableValues = selected
      .map((item) => item.value)
      .filter((value) => value !== undefined) as string[];
  

    // Check if each selected table exists in options.jsonData.metadata
    const updatedMetadata = { ...options.jsonData.metadata };
    tableValues.forEach((tableLabel) => {
      if (!updatedMetadata[tableLabel]) {
        // Create an empty object if the table does not exist
        updatedMetadata[tableLabel] = {};
      }
    });

    const jsonData = {
      ...options.jsonData,
      metadata: updatedMetadata,
    };

    onOptionsChange({ ...options, jsonData });
    fetchMetadataOptions(tableValues);
  };
  
  

  const fetchTableOptions = useCallback(async (inputValue: string): Promise<Array<{label: string, value: string}>> => {
    try {
      const url = jsonData.http ? jsonData.http.url : "";
  
      if (!url || "") {
        return [];
      }
  
      const response = await getBackendSrv().datasourceRequest({
        url: url + "/gettableoptions",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
  
      const asyncOptions = response.data
      .filter((element: string) => element.toLowerCase().includes(inputValue.toLowerCase()))
      .map((element: string) => ({
        label: element,
        value: element,
      }));

      // Sort alphabetically
      asyncOptions.sort((a: { label: string; value: string }, b: { label: string; value: string }) =>
        a.label.localeCompare(b.label)
      );

      return asyncOptions;
    } catch (error: any) {
      console.log(error);
      return [];
    }
  }, [jsonData]);
  



  const fetchMetadataOptions = useCallback(async (tables: string[]) => {
    try {
      const url = jsonData.http ? jsonData.http.url : "";

      //If the URL is not defined
      if (!url || "") {
        setMetadataOptions([]);
        return;
      }

      const response = await getBackendSrv().datasourceRequest({
        url: url + "/getmetadataoptions",
        data: { tables },
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      //Sort alphabetically and insert "Select All" at the beginning
      const optionsWithSelectAll = Object.entries(response.data as Record<string, any>).map(([tableName, columns]) => {
        const optionValues = [...columns];
        const sortedOptions = optionValues.sort((a, b) => a.localeCompare(b));
        sortedOptions.unshift("Select All"); 
        return {
          label: tableName,
          options: sortedOptions.map((value) => ({
            label: value,
          })),
        };
      });
      

      setMetadataOptions(optionsWithSelectAll);

      console.log(response);
      return;
    } catch (error: any) {
      console.log(error);

      setMetadataOptions([]);
      return;
    }
  }, [jsonData]);


  return (
    <div className="gf-form-group">
      <DataSourceHttpSettings
        defaultUrl={jsonData.http ? jsonData.http.url : ""}
        dataSourceConfig={jsonData.http ? jsonData.http : options}
        showAccessOptions={true}
        onChange={onHttpChange}
      />

      <h4>
        Excluded Data Flags
        <Tooltip content="Mark flags which you want excluded">
          <span style={{ cursor: "help" }}> 🛈</span>
        </Tooltip>
      </h4>
      <InlineFieldRow>
        {Object.keys(DefaultFlags).map((element, index) => (
          <InlineField key={index} label={element} labelWidth={16}>
            <div className="dark-box">
              <Switch
                name={element}
                disabled={false}
                value={
                  jsonData.flags && jsonData.flags[element]
                    ? jsonData.flags[element]
                    : false
                }
                onChange={onFlagsChange}
              />
            </div>
          </InlineField>
        ))}
      </InlineFieldRow>

      <h4>
        Included Meta Data{' '}
        <Tooltip content="Mark meta data which you want included">
          <span style={{ cursor: "help" }}> 🛈</span>
        </Tooltip>
        <br></br>
        <AsyncMultiSelect
          loadOptions={fetchTableOptions}
          defaultOptions
          value={tableOptions}
          onChange={onTableChange}
          isSearchable
        />
      </h4>
      <InlineFieldRow>
        {metadataOptions.length === 0 ? (
          <div>No Metadata tables selected. If no tables appear, verify API URL / table requirements & refresh.</div>
        ) : (
          metadataOptions.map((element, index) => (
            <React.Fragment key={index}>
              <InlineFieldRow>
                <InlineField>
                  <div>{element.label}</div>
                </InlineField>
              </InlineFieldRow>
              <InlineFieldRow>
                {element.options.map((option, optionIndex) => (
                  <InlineField key={optionIndex} label={option.label} labelWidth={16}>
                    <div className="dark-box">
                      <Switch
                        name={option.label}
                        disabled={false}
                        value={
                          jsonData.metadata && jsonData.metadata[element.label]
                            ? jsonData.metadata[element.label][option.label]
                            : false
                        }
                        onChange={onMetaChange(element.label)}
                      />
                    </div>
                  </InlineField>
                ))}
              </InlineFieldRow>
            </React.Fragment>
          ))
        )}
      </InlineFieldRow>


    </div>
  );
}
