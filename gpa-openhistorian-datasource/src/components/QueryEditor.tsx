//import React, { ChangeEvent, useState } from 'react';
import React, { useState } from 'react';
import { InlineField, Select } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  // const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   onChange({ ...query, queryText: event.target.value });
  // };

  // const onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   onChange({ ...query, constant: parseFloat(event.target.value) });
  //   // executes the query
  //   onRunQuery();
  // };

  //const [v, setValue] = useState(query.queryTypes[0]); // Initialize value with the first element in queryTypes


  

  //const { queryText, constant } = query;

  const selectOptions = [
    { label: 'Element List', value: "element" },
    { label: 'Filter Expression', value: "filter" },
    { label: 'Text Editor', value: "text" },
  ];

  const [value, setValue] = useState<SelectableValue<string>>(selectOptions[0]);

  const onSearchChange = (selected: SelectableValue<string>) => {
    setValue(selected);
    console.log(selected)
    if (selected) {
      onChange({ ...query, queryType: selected.value! }); // Convert the value to a string
      //onRunQuery();
    }
  };

  // const onCreateOption = (customValue: string) => {
  //   const newOption: SelectableValue<number> = { label: customValue, value: selectOptions.length };
  //   setValue(newOption);
  //   onChange({ ...query, queryType: newOption.value!.toString() });
  //   onRunQuery();
  // };

  
  return (
    <div className="gf-form">
      {/* <InlineField label="Constant">
        <Input onChange={onConstantChange} value={constant} width={8} type="number" step="0.1" />
      </InlineField>
      <InlineField label="Query Text" labelWidth={16} tooltip="Not used yet">
        <Input onChange={onQueryTextChange} value={queryText || ''} />
      </InlineField> */}
      <InlineField label="TYPE" labelWidth={10}>
        <Select
          options={selectOptions}
          value={value}
          onChange={onSearchChange}
          allowCustomValue
        />
      </InlineField>
    </div>
  );
}
