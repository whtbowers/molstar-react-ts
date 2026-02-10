import { useState } from 'react';
import MolstarWrapper from './components/molstar-ts/MolstarWrapper';
import { Input, Radio } from 'antd';

const defaultPdbId = '1LOL';

function App() {
  const [pdbId, setPdbId] = useState(defaultPdbId);
  const [theme, setTheme] = useState('light');

  return (
      <div className="App">
        <Input placeholder="Enter PDB ID" defaultValue={pdbId} onPressEnter={(e) => setPdbId(e.target.value) } />
        <Radio.Group options={[{value: 'light', label: 'Light'}, {value: 'dark', label: 'Dark'}, 
          // {value: 'blue', label: 'Blue'}
          ]} value={theme} onChange={(e) => setTheme(e.target.value) } />
          <div style={{ maxWidth: '100%', maxHeight: 900, height: 800 }}>
              <MolstarWrapper pdbId={pdbId} useInterface={true} uiTheme={theme} className={`theme-${theme}`}/>
          </div>
      </div>
  );
}

export default App;
