//import React, { ChangeEvent, useState } from 'react';
import React, { useState } from 'react';
import { InlineField, Select, AsyncMultiSelect } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  //const { queryText, constant } = query;

  const selectOptions = [
    { label: 'Element List', value: "element" },
    { label: 'Filter Expression', value: "filter" },
    { label: 'Text Editor', value: "text" },
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
    // const asyncOptions = [
    //   { label: 'Option 1', value: 'option1' },
    //   { label: 'Option 2', value: 'option2' },
    //   { label: 'Option 3', value: 'option3' },
    // ];

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
      {typeValue?.value === 'element' && renderAsyncMultiSelect()}
    </div>
  );
}
