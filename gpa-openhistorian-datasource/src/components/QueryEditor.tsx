import React, { useState, useEffect } from 'react';
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

  const [loading, setLoading] = useState(true);
  const [typeValue, setTypeValue] = useState<SelectableValue<string>>(
    query.queryType ? { label: query.queryType, value: query.queryType } : selectOptions[0]
  );
  const [tableOptions, setTableOptions] = useState<Array<SelectableValue<string>>>();

  //Only runs on page loading - prevents repetitive api calls
  useEffect(() => {
    const fetchData = async () => {
      //Elements List
      const searchRes = await datasource.searchQuery();
      query.elementsList = searchRes.data || [];
      
      //Metadata Tables
      const tablesRes = await datasource.tableOptionsQuery();
      query.tablesList = tablesRes.data || [];

      //Metadata Options
      const metadataRes = await datasource.metadataOptionsQuery(tablesRes.data);
      query.metadataList = metadataRes.data || {}

      onChange({ ...query });

      setLoading(false);
    };
    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchChange = (selected: SelectableValue<string>) => {
    // Convert elements between Element List and Text Editor modes
    if (
      (query.queryType === 'Element List' || query.queryType === undefined) &&
      selected.value === 'Text Editor'
    ) {
      // Convert elements to queryText
      query.queryText = datasource.targetToString(query);

      // Remove elements
      query.elements = [];
    } else if (query.queryType === 'Text Editor' && selected.value === 'Element List') {
      if (query.queryText && query.queryText.trim() !== '') {
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
    const selectedValues = selected.map((item) => item.value) as string[];
    onChange({ ...query, elements: selectedValues });
    onRunQuery();
  };

  const onTextInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    onChange({ ...query, queryText: value });
  };

  const onTableChange = async (selected: Array<SelectableValue<string>>) => {
    setTableOptions(selected);
    let newMetadataOptions: { [key: string]: string[] } = {};
  
    selected.forEach((item) => {
      if (item.value === undefined) {
        return;
      }
  
      const [tableName, target] = item.value.split(';');
  
      if (!newMetadataOptions.hasOwnProperty(tableName)) {
        newMetadataOptions[tableName] = [target];
      } else {
        newMetadataOptions[tableName].push(target);
      }
      

    });

    onChange({ ...query, metadataOptions: newMetadataOptions });
    onRunQuery();
  };
  

  const loadElementsOptions = async (inputValue: string) => {
    const asyncOptions = query.elementsList
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

  const renderElements = () => {
    const elementsValue: Array<SelectableValue<string>> = query.elements
      ? query.elements.map((element) => ({
          label: element,
          value: element,
        }))
      : [];

    return (
      <div style={{ width: '100%' }}>
        <InlineField label="Elements" labelWidth={12}>
          <AsyncMultiSelect
            loadOptions={loadElementsOptions}
            defaultOptions
            value={elementsValue}
            onChange={onElementsChange}
            isSearchable
          />
        </InlineField>
      </div>
    );
  };

  const loadTableOptions = async (inputValue: string) => {
    const tableOptions = query.tablesList
    const metadataOptions = query.metadataList
  
    const asyncOptions = tableOptions
      //.filter((table: string) => table.toLowerCase().includes(inputValue.toLowerCase()))
      .map((table: string) => {
        //Generate metadata options
        const metadataData = metadataOptions[table] as string[];
        const metadataElements = metadataData
          .filter((metadataElement: string) => metadataElement.toLowerCase().includes(inputValue.toLowerCase()))
          .map((metadataElement: string) => {
            return {
              label: metadataElement,
              value: table + ";"+ metadataElement,
            };
          });
  
        // Sort alphabetically
        metadataElements.sort((a, b) => a.label.localeCompare(b.label)); 
  
        return {
          label: table,
          value: table,
          options: metadataElements || [],
        };
      });
  
    asyncOptions.sort((a: { label: string; value: string }, b: { label: string; value: string }) =>
      a.label.localeCompare(b.label)
    );
  
    return asyncOptions;
  };
  
  
  const renderTextBox = () => {
    return (
      <div style={{ width: '100%' }}>
        <InlineField label="Text Editor" labelWidth={12}>
          <TextArea
            value={query.queryText}
            onChange={onTextInputChange}
            rows={10}
            style={{ minWidth: '300px', width: '100%' }}
          />
        </InlineField>
      </div>
    );
  };

  return (
    <div className="gf-form" style={{ display: 'flex', flexDirection: 'column' }}>
      {loading ? ( // Render a loading indicator while loading is true
        <div>Loading...</div>
      ) : (
        <>
          <InlineField label="TYPE" labelWidth={12}>
            <Select options={selectOptions} value={typeValue} onChange={onSearchChange} allowCustomValue />
          </InlineField>
          {query.queryType === 'Element List' || query.queryType === undefined && renderElements()}
          {query.queryType === 'Text Editor' && renderTextBox()}
  
          <InlineField label="Metadata" labelWidth={12}>
            <div>
              <AsyncMultiSelect
                loadOptions={loadTableOptions}
                defaultOptions
                value={tableOptions}
                onChange={onTableChange}
                isSearchable
              />
            </div>
          </InlineField>
        </>
      )}
    </div>
  );
  
}
