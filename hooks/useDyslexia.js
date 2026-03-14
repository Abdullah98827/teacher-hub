import { useContext } from 'react';
import { DyslexiaContext } from '../contexts/DyslexiaContext';

export default function useDyslexia() {
  const { dyslexiaMode } = useContext(DyslexiaContext);

  // Returns a style object for Text components
  if (dyslexiaMode) {
    return {
      fontFamily: 'Arial', // System font, can be Verdana, Comic Sans, etc.
      letterSpacing: 1.5, // Increased letter spacing
      lineHeight: 28, // Increased line height
      fontSize: 18, // Increased font size for better readability
    };
  } else {
    return {};
  }
}
