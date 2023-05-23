//import React, { ChangeEvent, useState } from 'react';
import React, { useState } from 'react';
import { InlineField, Select, AsyncMultiSelect } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  //const { queryText, elements } = query;

  const selectOptions = [
    { label: 'Element List', value: "Element List" },
    { label: 'Filter Expression', value: "Filter" },
    { label: 'Text Editor', value: "Text" },
  ];

  const [typeValue, setTypeValue] = useState<SelectableValue<string>>(selectOptions[0]);
  const [elementsValue, setElementsValue] = useState<Array<SelectableValue<string>>>([]);

  const onSearchChange = (selected: SelectableValue<string>) => {
    setTypeValue(selected);
    //console.log(selected)
    if (selected) {
      onChange({ ...query, queryType: selected.value! }); // Convert the value to a string
    }
  };

  const onElementsChange = (selected: Array<SelectableValue<string>>) => {
    setElementsValue(selected);
    const selectedValues = selected.map((item) => item.value) as string[];
    //console.log(selectedValues);
    onChange({ ...query, elements: selectedValues });
    // Trigger the query execution
    onRunQuery();
  };
  
  const renderAsyncMultiSelect = () => {
    const loadAsyncOptions = async () => {
      const response = await getBackendSrv().datasourceRequest({
        url: "https://openhistorian.demo.gridprotectionalliance.org/api/grafana/search",
        method: 'POST',
        data: { target: "" }
      });
        
      const asyncOptions = response.data.map((element: string) => ({
        label: element,
        value: element,
      }));

      //Sort alphabetically
      asyncOptions.sort((a: { label: string; value: string; }, b: { label: string; value: string; }) => a.label.localeCompare(b.label)); 
    
      return asyncOptions;
    };
    

    return (
      <InlineField label="Elements" labelWidth={10}>
        {/* <div style={{ width: 'auto' }}> */}
        <AsyncMultiSelect
          loadOptions={loadAsyncOptions}
          defaultOptions
          value={elementsValue}
          onChange={onElementsChange}
        />
        {/* </div> */}
      </InlineField>
    );
  }

  
  return (
    <div className="gf-form">
      <InlineField label="TYPE" labelWidth={10}>
        <Select
          options={selectOptions}
          value={typeValue}
          onChange={onSearchChange}
          allowCustomValue
        />
      </InlineField>
      {typeValue?.value === 'Element List' && renderAsyncMultiSelect()}
    </div>
  );
}
