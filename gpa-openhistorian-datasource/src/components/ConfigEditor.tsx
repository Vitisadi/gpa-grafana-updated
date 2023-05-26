// import React, { ChangeEvent } from 'react';
// import { InlineField, Input, DataSourceHttpSettings  } from '@grafana/ui';
import React from 'react';
import { DataSourceHttpSettings  } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, DataSourceSettings } from '@grafana/data';
import { MyDataSourceOptions } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  // const onURLChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   const jsonData = {
  //     ...options.jsonData,
  //     url: event.target.value,
  //   };
  //   onOptionsChange({ ...options, jsonData });
  // };

  const onHttpChange = (config: DataSourceSettings<MyDataSourceOptions>) => {
    const jsonData = {
      ...options.jsonData,
      http: config,
    };

    console.log(jsonData)
    onOptionsChange({ ...options, jsonData });
  };

  const { jsonData } = options;

  return (
    <div className="gf-form-group">
      {/* <InlineField label="API Url" labelWidth={12}>
        <Input
          onChange={onURLChange}
          value={jsonData.url || ''}
          placeholder="URL leading to API"
          width={40}
        />
      </InlineField> */}
      <DataSourceHttpSettings
        defaultUrl={jsonData.http ? jsonData.http.url : ''}
        dataSourceConfig={jsonData.http ? jsonData.http : options}
        showAccessOptions={true}
        onChange={onHttpChange}
      />
    </div>
  );
}
