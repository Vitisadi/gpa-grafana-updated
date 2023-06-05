import { 
  DataSourceHttpSettings,
  InlineFieldRow, 
  InlineField, 
  Switch, 
  Tooltip, 
  Button,
} from '@grafana/ui';

import React, { useState, useCallback  } from 'react';
import { DataSourcePluginOptionsEditorProps, DataSourceSettings } from '@grafana/data';
import { MyDataSourceOptions } from '../types';
import { DefaultFlags } from '../js/constants';
import { getBackendSrv } from '@grafana/runtime';
import '../css/config-editor.css';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;

  const onHttpChange = (config: DataSourceSettings<MyDataSourceOptions>) => {
    const jsonData = {
      ...options.jsonData,
      flags: options.jsonData.flags || {},
      http: config,
    };

    console.log("Version 3")

    onOptionsChange({ ...options, jsonData });
  };

  const { jsonData } = options;


  const updateData = (optionsData: any, elements: string[], selectAllState: boolean) => {
    let updatedData: { [key: string]: boolean } = {};
  
    elements.forEach((element: string) => {
      updatedData[element] = selectAllState;
    });
  
    return updatedData;
  };
  
  const onSwitchChange = (type: "flags" | "metadata") => (event: React.FormEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const { name, checked } = input;
    
    let elements: string[] = [];
    let updatedData: { [key: string]: boolean } = {};
  
    // Select All
    if (name === 'Select All') {
      if (type === 'metadata') {
        elements = options.jsonData.allMetadataOptions || [];
      } else if (type === 'flags') {
        elements = Object.keys(DefaultFlags || {});
      }
  
      const selectAllState = !options.jsonData[type] || options.jsonData[type]["Select All"] === undefined || options.jsonData[type]["Select All"] === false;
      updatedData = updateData(options.jsonData[type], elements, selectAllState);
    } else {
      //If other switches are toggled, update their respective values
      updatedData = {
        ...options.jsonData[type],
        [name]: checked,
        ['Select All']: false,
      };
    }
  
    const jsonData = {
      ...options.jsonData,
      [type]: updatedData,
    };
  
    onOptionsChange({ ...options, jsonData });
  };
  
  
  
  
  
  


  const [metaDataOptions, setMetaDataOptions] = useState<string[]>([]);

  const fetchMetadataOptions = useCallback(async () => {
    const newOptions = ["Select All", "A", "B", "C", "D"];
    try {
      const url = jsonData.http ? jsonData.http.url : '';
      setMetaDataOptions(newOptions);
      //return newOptions
  
      //If the URL is not defined
      if (!url || '') {
        onOptionsChange({
          ...options,
          jsonData: { ...jsonData, allMetadataOptions: newOptions }
        });
        return ["Select All"];
      }
  
      const response = await getBackendSrv().datasourceRequest({
        url: url + '/getmetadataoptions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      //Add "Select All" to the beginning of the array
      const optionsWithSelectAll = ["Select All"].concat(response.data);
  
      onOptionsChange({
        ...options,
        jsonData: { ...jsonData, allMetadataOptions: optionsWithSelectAll }
      });
  
      setMetaDataOptions(optionsWithSelectAll);
  
      console.log(response)
      return optionsWithSelectAll;
    } catch (error: any) {
      console.log(error)
      
      //If the response status is 404
      if (error.status === 404) {
        onOptionsChange({
          ...options,
          jsonData: { ...jsonData, allMetadataOptions: newOptions }
        });
        return ["Select All"];
      }

      // In case of any error, set metadata options as ["Select All"]
      setMetaDataOptions(["Select All"]);
      return ["Select All"]
    }
  }, [options, onOptionsChange, jsonData]);

  

  const refreshMetadataOptions = () => {
    fetchMetadataOptions();
  };

  return (
    <div className="gf-form-group">
      <DataSourceHttpSettings
        defaultUrl={jsonData.http ? jsonData.http.url : ''}
        dataSourceConfig={jsonData.http ? jsonData.http : options}
        showAccessOptions={true}
        onChange={onHttpChange}
      />

      <h4>
        Excluded Data Flags
        <Tooltip content="Mark flags which you want excluded">
          <span style={{ cursor: 'help' }}> 🛈</span>
        </Tooltip>
      </h4>
      <InlineFieldRow>
        {Object.keys(DefaultFlags).map((element, index) => (
          <InlineField key={index} label={element} labelWidth={16} >
            <div className="dark-box">
              <Switch
                name={element}
                disabled={false}
                value={jsonData.flags && jsonData.flags[element] ? jsonData.flags[element] : false}
                onChange={onSwitchChange('flags')}
              />
            </div>
          </InlineField>
        ))}
      </InlineFieldRow>

      <h4>
        Included Meta Data
        <Tooltip content="Mark meta data which you want included">
          <span style={{ cursor: 'help' }}> 🛈</span>
        </Tooltip>
        <Button onClick={refreshMetadataOptions}>Refresh</Button>
      </h4>
      <InlineFieldRow>
        {metaDataOptions.map((element, index) => (
          <InlineField key={index} label={element} labelWidth={16} >
            <div className="dark-box">
              <Switch
                name={element}
                disabled={false}
                value={jsonData.metadata && jsonData.metadata[element] ? jsonData.metadata[element] : false}
                onChange={onSwitchChange('metadata')}
              />
            </div>
          </InlineField>
        ))}
      </InlineFieldRow>
    </div>
  );
}
