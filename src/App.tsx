import { useState } from 'react';
import MolstarWrapper from './components/molstar-ts/MolstarWrapper';
import { Input, Radio, Collapse, Select } from "antd";

import type { CollapseProps } from "antd";

// const defaultPdbId = '1LOL';
type Content =
    | { type: "pdbID"; data: string }
    | { type: "file"; data: { filestring: string; type: string } }
    | null;





function App() {

  const [theme, setTheme] = useState('light');
  const [content, setContent] = useState<Content | null>(null);

  const handleFilepathChange = async (value: string) => {
      const filestring = `/data/${value}`;
      // get file content
      const response = await fetch(filestring);
      const fileContent = await response.text();
      const fileType = value.split('.').pop();
      setContent({ type: 'file', data: { filestring: fileContent, type: fileType === 'cif' ? 'mmcif' : fileType } });
  };

  const items: CollapseProps["items"] = [
      {
          key: "1",
          label: "Choose UI Theme",
          children: (
              <Radio.Group
                  options={[
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                      // {value: 'blue', label: 'Blue'}
                  ]}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
              />
          ),
      },
      {
          key: "2",
          label: "Load structure using PDB ID",
          children: (
              <Input
                  placeholder="Enter PDB ID"
                  onPressEnter={(e) => setContent({ type: 'pdbID', data: e.target.value })}
              />
          ),
      },
      {
          key: "3",
          label: "Load structure from path",
          children: (
              <Select
                  defaultValue=""
                  style={{ width: 120 }}
                  onChange={handleFilepathChange}
                  options={[
                      { value: "1IGT.cif", label: "1IGT.cif" },
                      { value: "9O1Y.pdb", label: "9O1Y.pdb" }
                  ]}
              />
          ),
      }
  ];

  return (
      <div className="App">
          <Collapse accordion items={items} />
          <div style={{ maxWidth: "100%", maxHeight: 900, height: 800 }}>
              <MolstarWrapper
                  pdbId={content?.type === "pdbID" ? content.data : null}
                  file={content?.type === "file" ? content.data : null}
                  useInterface={true}
                  uiTheme={theme}
                  className={`theme-${theme}`}
              />
          </div>
      </div>
  );
}

export default App;
