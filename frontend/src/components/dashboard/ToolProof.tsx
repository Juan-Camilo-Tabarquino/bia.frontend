import React from 'react';
import './ToolProof.module.scss';
import '../../styles/globals.module.scss';
import { Collapse, List } from 'antd';

const { Panel } = Collapse;

interface ToolProofProps {
  toolName: string;
  output: unknown;
}

export default function ToolProof({ toolName, output }: ToolProofProps) {
  return (
    <Collapse accordion style={{ marginTop: 16 }} aria-live="polite" role="region">
      <Panel header={toolName} key={toolName}>
        <pre>{JSON.stringify(output, null, 2)}</pre>
      </Panel>
    </Collapse>
  );
}
