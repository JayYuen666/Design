import React, { useState } from 'react';
import { TreeSelect } from 'tdesign-react';

const options = [
  {
    label: '广东省',
    value: 'guangdong',
    children: [
      {
        label: '广州市',
        value: 'guangzhou',
      },
      {
        label: '深圳市',
        value: 'shenzhen',
      },
    ],
  },
  {
    label: '江苏省',
    value: 'jiangsu',
    disabled: true,
    children: [
      {
        label: '南京市',
        value: 'nanjing',
      },
      {
        label: '苏州市',
        value: 'suzhou',
      },
    ],
  },
];

export default function Example() {
  const [value, setValue] = useState('guangdong');

  return (
    <TreeSelect
      data={options}
      clearable
      value={value}
      onChange={(val) => {
        setValue(val);
        console.log(val);
      }}
      style={{ width: 300 }}
    />
  );
}
