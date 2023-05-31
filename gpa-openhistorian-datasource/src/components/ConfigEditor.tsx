import React from 'react';
import { DataSourceHttpSettings, InlineFieldRow, InlineField, Switch } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, DataSourceSettings } from '@grafana/data';
import { MyDataSourceOptions } from '../types';
import { DefaultFlags } from '../js/constants';
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

    onOptionsChange({ ...options, jsonData });
  };

  const { jsonData } = options;


  const onSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;

    let updatedFlags: { [key: string]: boolean } = {};

    //Select All
    if (name === 'Select All') {
      //Select All Undefined or false
      if(options["jsonData"]["flags"]["Select All"] === undefined || options["jsonData"]["flags"]["Select All"] === false){
        Object.keys(DefaultFlags).forEach((element) => {
          updatedFlags[element] = true;
        });
      }
      //True
      else{
        Object.keys(DefaultFlags).forEach((element) => {
          updatedFlags[element] = false;
        });
      }
      
    } else {
      // If other switches are toggled, update their respective values
      updatedFlags = {
        ...options.jsonData.flags,
        [name]: checked,
        ['Select All']: false,
      };
    }

  const jsonData = {
    ...options.jsonData,
    flags: updatedFlags,
  };
    
    onOptionsChange({ ...options, jsonData });
  };

  return (
    <div className="gf-form-group">
      <DataSourceHttpSettings
        defaultUrl={jsonData.http ? jsonData.http.url : ''}
        dataSourceConfig={jsonData.http ? jsonData.http : options}
        showAccessOptions={true}
        onChange={onHttpChange}
      />

      <h3>Excluded Data Flags</h3>
      <InlineFieldRow>
        {Object.keys(DefaultFlags).map((element, index) => (
          <InlineField key={index} label={element} labelWidth={16} >
            <div className="dark-box">
              <Switch
                name={element}
                disabled={false}
                value={jsonData.flags && jsonData.flags[element] ? jsonData.flags[element] : false}
                onChange={onSwitchChange}
              />
            </div>
          </InlineField>
        ))}
      </InlineFieldRow>
    </div>
  );
}
