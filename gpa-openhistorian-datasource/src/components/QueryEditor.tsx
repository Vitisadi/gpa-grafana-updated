// import React, { ChangeEvent, useState } from 'react';
import React, { useState } from 'react';
import { InlineField, Select, AsyncMultiSelect } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  // const { queryText, elements } = query;

  const selectOptions = [
    { label: 'Element List', value: 'Element List' },
    { label: 'Filter Expression', value: 'Filter' },
    { label: 'Text Editor', value: 'Text' },
  ];

  const [typeValue, setTypeValue] = useState<SelectableValue<string>>(selectOptions[0]);
  const [elementsValue, setElementsValue] = useState<Array<SelectableValue<string>>>([]);

  const onSearchChange = (selected: SelectableValue<string>) => {
    setTypeValue(selected);
    if (selected) {
      onChange({ ...query, queryType: selected.value! });
    }
  };

  const onElementsChange = (selected: Array<SelectableValue<string>>) => {
    setElementsValue(selected);
    const selectedValues = selected.map((item) => item.value) as string[];
    onChange({ ...query, elements: selectedValues });
    // Trigger the query execution
    onRunQuery();
  };

  const loadAsyncOptions = async (inputValue: string) => {
    const response = await datasource.searchQuery();

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
  };

  const renderAsyncMultiSelect = () => {
    return (
      <div style={{ width: '100%' }}> {/* Add this wrapper div to make the AsyncMultiSelect span the full width */}
        <InlineField label="Elements" labelWidth={10}>
          <AsyncMultiSelect
            loadOptions={loadAsyncOptions}
            defaultOptions
            value={elementsValue}
            onChange={onElementsChange}
            isSearchable
          />
        </InlineField>
      </div>
    );
  };

  return (
    <div className="gf-form" style={{ display: 'flex', flexDirection: 'column' }}> {/* Add flexbox styles to make the elements stack vertically */}
      <InlineField label="TYPE" labelWidth={10}>
        <Select options={selectOptions} value={typeValue} onChange={onSearchChange} allowCustomValue />
      </InlineField>
      {typeValue?.value === 'Element List' && renderAsyncMultiSelect()}
    </div>
  );
}
