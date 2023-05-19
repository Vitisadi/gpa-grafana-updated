//import React, { ChangeEvent, useState } from 'react';
import React, { useState } from 'react';
import { InlineField, Select, AsyncMultiSelect } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
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
    // API Data here

    // const result = await getBackendSrv().datasourceRequest({
    //   method: "GET",
    //   url: "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=15min&apikey=MBMP5F530P7DL6ZG",
    //   params: query,
    // })

    const asyncOptions = [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
      { label: 'Option 3', value: 'option3' },
    ];

    const loadAsyncOptions = () => {
      return new Promise<Array<SelectableValue<string>>>((resolve) => {
        setTimeout(() => {
          resolve(asyncOptions);
        }, 2000);
      });
    };

    return (
      <InlineField label="Elements" labelWidth={10}>
        <AsyncMultiSelect
          loadOptions={loadAsyncOptions}
          defaultOptions
          value={elementsValue}
          onChange={onElementsChange}
        />
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
