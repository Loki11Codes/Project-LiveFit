import { render } from '@testing-library/react';
import { test, expect } from 'vitest';
import { GoogleMark } from './GoogleMark';
import React from 'react';

test('GoogleMark renders the Google SVG logo', () => {
  const { container } = render(<GoogleMark />);
  
  // Find the SVG element
  const svgEntry = container.querySelector('svg');
  expect(svgEntry).toBeInTheDocument();
  
  // Verify it has the correct aria-hidden attribute
  expect(svgEntry).toHaveAttribute('aria-hidden', 'true');
  
  // Verify dimensions
  expect(svgEntry).toHaveAttribute('width', '18');
  expect(svgEntry).toHaveAttribute('height', '18');
});
