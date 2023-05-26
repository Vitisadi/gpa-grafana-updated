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

  const onSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    console.log(name, checked);

    let updatedFlags: { [key: string]: boolean } = {};

    if (name === 'Select All') {
      // If 'Select All' switch is toggled, set all other switches to true
      Object.keys(DefaultFlags).forEach((element) => {
        if (element !== 'Select All') {
          updatedFlags[element] = true;
        }
      });
    } else {
      // If other switches are toggled, update their respective values
      updatedFlags = {
        ...options.jsonData.flags,
        [name]: checked,
      };
    }

  const jsonData = {
    ...options.jsonData,
    flags: updatedFlags,
  };
    
    console.log(jsonData)
    onOptionsChange({ ...options, jsonData });
  };

  const { jsonData } = options;

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
