// import React, { ChangeEvent, useState } from 'react';
import React, { useState } from 'react';
import { InlineField, Select, AsyncMultiSelect, TextArea } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {

  const selectOptions = [
    { label: 'Element List', value: 'Element List' },
    { label: 'Text Editor', value: 'Text Editor' },
  ];

  const [typeValue, setTypeValue] = useState<SelectableValue<string>>(
    query.queryType
      ? { label: query.queryType, value: query.queryType }
      : selectOptions[0]
  );

  const onSearchChange = (selected: SelectableValue<string>) => {
    // Convert elements between Element List and Text Editor modes
    if (query.queryType === 'Element List' || query.queryType === undefined && selected.value === 'Text Editor') {
      // Convert elements to queryText
      query.queryText = datasource.targetToString(query);
  
      // Remove elements
      query.elements = [];
    } else if (query.queryType === 'Text Editor' && selected.value === 'Element List') {
      if(query.queryText && query.queryText.trim() !== ''){
        // Convert queryText to elements
        const elements = datasource.targetToList(query);
        query.elements = elements;
      }
  
      // Remove queryText
      query.queryText = '';
    }
  
    setTypeValue(selected);
    if (selected) {
      onChange({ ...query, queryType: selected.value! });
    }
  
    onRunQuery();
  };
  

  const onElementsChange = (selected: Array<SelectableValue<string>>) => {
    // setElementsValue(selected);
    const selectedValues = selected.map((item) => item.value) as string[];
    onChange({ ...query, elements: selectedValues });
    // Trigger the query execution
    onRunQuery();
  };

  const onTextInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    // s(value);
    onChange({ ...query, queryText: value });
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
    const elementsValue: Array<SelectableValue<string>> = 
      query.elements ? query.elements.map((element) => ({
        label: element,
        value: element,
      }))
      : [];

  
    return (
      <div style={{ width: '100%' }}>
        <InlineField label="Elements" labelWidth={12}>
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
  

  const renderTextBox = () => {
    return (
      <div style={{ width: '100%' }}>
        <InlineField label="Text Editor" labelWidth={12}>
          <TextArea value={query.queryText} onChange={onTextInputChange} rows={10} style={{ minWidth: '300px', width: '100%' }} />
        </InlineField>
      </div>
    );
  };
  
  return (
    <div className="gf-form" style={{ display: 'flex', flexDirection: 'column' }}>
      <InlineField label="TYPE" labelWidth={12}>
        <Select options={selectOptions} value={typeValue} onChange={onSearchChange} allowCustomValue />
      </InlineField>
      {(query.queryType === 'Element List' || query.queryType === undefined) && renderAsyncMultiSelect()}
      {query.queryType === 'Text Editor' && renderTextBox()}
    </div>
  );  
}
