import React, { useState, useEffect } from 'react';
import { InlineFieldRow, InlineField, Select, AsyncMultiSelect, TextArea, MultiSelect } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { SelectOptions, Booleans, AngleUnits, TimeUnits } from '../js/constants'
import "../css/query-editor.css";

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;


export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [loading, setLoading] = useState(true);
  const [typeValue, setTypeValue] = useState<SelectableValue<string>>(
    query.queryType ? { label: query.queryType, value: query.queryType } : SelectOptions[0]
  );
  // const [functionValue, setFunctionValue] = useState<Array<SelectableValue<string>>>([]);
  const [tableOptions, setTableOptions] = useState<Array<SelectableValue<string>>>();

  //Only runs on page loading - prevents repetitive api calls
  useEffect(() => {
    const fetchData = async () => {
      //Variables
      query.elements = []
      query.queryType = "Element List"
      query.queryText = ""
      query.metadataOptions = {}
      query.functions = []
      query.functionValues= {}
      query.elementsList = []
      query.tablesList = []

      //Elements List
      const searchRes = await datasource.searchQuery();
      query.elementsList = searchRes.data || [];
      
      //Metadata Tables
      const tablesRes = await datasource.tableOptionsQuery();
      query.tablesList = tablesRes.data || [];

      //Metadata Options
      const metadataRes = await datasource.metadataOptionsQuery(tablesRes.data);
      query.metadataList = metadataRes.data || {}

      //Define function list
      const functionRes = await datasource.functionOptionsQuery()
      query.functionList = {};

      Object.entries(functionRes.data).forEach(([key, value]: [string, any]) => {
        const name: string = value.Name;
        query.functionList[name] = value;
      });

      //Define function values
      query.functionValues = {};
      Object.entries(query.functionList).forEach(([key, value]: [string, any]) => {
        const label: string = value.Name;
        const parameters = value.Parameters;
        
        if (parameters.length > 0) {
          query.functionValues[label] = parameters.map((param: any) => param.Default);
        }
      });

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

  // Helper function for Function Changes. Sets specified change
  const changeFunctionValue = (newValue: string, name: string, index: number) => {
    let newArray = query.functionValues[name]
    newArray[index] = newValue

    const updatedFunctionValues = {
      ...query.functionValues,
      [name]: newArray,
    };
    onChange({ ...query, functionValues: updatedFunctionValues });
  }

  const onFunctionSelectorChange = (selected: Array<SelectableValue<string>>) => {
    const selectedFunctions = selected.map((item) => item.value) as string[];
    onChange({ ...query, functions: selectedFunctions });
  };

  const onFunctionTextBoxChange = (event: React.ChangeEvent<HTMLInputElement>, name: string, type: string, index: number) => {
    let newValue = event.target.value;
    if(type === "int"){
      const parsedValue = parseInt(event.target.value, 10) 
      newValue = isNaN(parsedValue) ? query.functionList[name].Parameters[0].Default : parsedValue.toString()
    }
    else if(type === "double" || type === "float" || type === "decimal"){
      const lastCharacter = event.target.value.slice(-1);
      const parsedValue = parseFloat(event.target.value)  
      newValue = isNaN(parsedValue) ? query.functionList[name].Parameters[0].Default : parsedValue.toString()
      if (lastCharacter === ".") {
        newValue += "."
      }
    }

    changeFunctionValue(newValue, name, index)
  }

  

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

  const renderFunctionDropdownOptions = (type: string) => {
    // Determine options array based on type
    let options: string[] = [];
    if (type === 'boolean') {
      options = Booleans;
    } else if (type === 'time') {
      options = TimeUnits;
    } else if (type === 'angleUnits') {
      options = AngleUnits;
    }

    return options.map((option, index) => (
      <option key={index} value={option}>
        {option}
      </option>
    ))
  }

  const renderFunctionSelector = () => {
    const sortedFunctionOptions = Object.entries(query.functionList)
      .map(([key, value]) => ({
        label: key,
        value: key,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  
    return (
      <InlineField label="Functions" labelWidth={12}>
        {/* Dropdown Selection */}
        <MultiSelect
          options={sortedFunctionOptions}
          value={query.functions.map((func) => ({
            label: func,
            value: func,
          }))}
          onChange={onFunctionSelectorChange}
          isSearchable
        />
      </InlineField>
    );
  };
  
  

  const renderFunctions = () => {
    if(query.functions.length === 0){
      return renderFunctionSelector()
    }

    return (
      <div>
        <InlineFieldRow>
          {renderFunctionSelector()}
          <div className="dark-box" style={{ display: 'flex', alignItems: 'center' }}>

            {/* Iterate through selected functions */}
            {query.functions.map((name, index) => {
              const selectedFunction = query.functionList[name];

              const hasParameters = selectedFunction && selectedFunction.Parameters && selectedFunction.Parameters.length > 0
              {/* Generate Function */}
              return (
                <div key={index}>
                  <span style={{ margin: 0 }}>{name}</span>
                  <span>(</span>
                  {/* Iterate through Parameters */}
                  {hasParameters && selectedFunction.Parameters.map((param, paramIndex) => {
                    const type = param.ParameterTypeName;

                    return (
                      <React.Fragment key={paramIndex}>
                        {/* Typing Box */}
                        {(type === 'string' || type === 'double' || type === 'float' || type === "decimal" || type === 'int') && (
                          <input
                            type="text"
                            value={query.functionValues[name][paramIndex]}
                            style={{ width: `${query.functionValues[name].length * 20}px` }}
                            onChange={(event) => {
                              onFunctionTextBoxChange(event, name, type, paramIndex);
                            }}
                            onInput={(event) => {
                              const target = event.target as HTMLInputElement;
                              target.style.width = `${target.value.length * 10}px`;
                            }}
                          />
                        )}

                        {/* Dropdown */}
                        {(type === 'boolean' || type === 'time' || type === 'angleUnits') && (
                          <select
                            value={query.functionValues[name][paramIndex]}
                            onChange={(event) => {
                              changeFunctionValue(event.target.value, name, paramIndex)
                            }}
                            className="auto-width"
                          >
                            {renderFunctionDropdownOptions(type)}
                          </select>
                        )}

                        {type !== 'data' && (
                          <span>,</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
            <span style={{ color: 'rgb(93, 114, 176)' }}>QUERY</span>
            {query.functions.length > 0 && <span>{')'.repeat(query.functions.length)}</span>}
          </div>
        </InlineFieldRow>
      </div>
    );
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

  const loadTableOptions = async (inputValue: string) => {
    const tableOptions = query.tablesList
    const metadataOptions = query.metadataList
  
    const asyncOptions = tableOptions
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

  return (
    <div className="gf-form" style={{ display: 'flex', flexDirection: 'column' }}>
      {loading ? ( // Render a loading indicator while loading is true
        <div>Loading...</div>
      ) : (
        <>
          <InlineField label="TYPE" labelWidth={12}>
            <Select options={SelectOptions} value={typeValue} onChange={onSearchChange} allowCustomValue />
          </InlineField>
          {(query.queryType === 'Element List' || query.queryType === undefined) && renderElements() }
          {(query.queryType === 'Element List' || query.queryType === undefined) && renderFunctions() }
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
