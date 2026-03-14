import { TextInput } from 'react-native';
import useDyslexia from '../hooks/useDyslexia';

export function ThemedTextInput(props) {
  const dyslexiaStyle = useDyslexia();
  return (
    <TextInput
      {...props}
      style={[props.style, dyslexiaStyle]}
      placeholderTextColor={props.placeholderTextColor || '#888'}
    />
  );
}
